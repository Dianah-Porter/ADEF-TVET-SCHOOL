import { prisma } from '../../lib/prisma';
import { detectFileType, isImage, IMAGE_TYPES, describeAccepted } from '../../lib/fileType';
import { processImage } from '../../lib/imageProcessor';
import { storage, buildStorageKey, thumbnailKeyFor } from '../../storage';
import { ApiError } from '../../utils/ApiError';
import { buildPageMeta } from '../../utils/respond';
import type { AdminListQuery, ListQuery, UpdateImageInput } from './gallery.schema';

/** What the public site is allowed to see about an image. */
const publicFields = {
  id: true,
  title: true,
  caption: true,
  altText: true,
  category: true,
  url: true,
  thumbnailUrl: true,
  width: true,
  height: true,
  sortOrder: true,
} as const;

export async function listPublic(query: ListQuery) {
  const where = {
    published: true,
    ...(query.category ? { category: query.category } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.galleryImage.findMany({
      where,
      select: publicFields,
      // sortOrder is the order an admin dragged them into; createdAt only
      // breaks ties so the result is never non-deterministic.
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.galleryImage.count({ where }),
  ]);

  return { items, meta: buildPageMeta(query.page, query.limit, total) };
}

export async function listCategories() {
  const rows = await prisma.galleryImage.groupBy({
    by: ['category'],
    where: { published: true },
    _count: true,
    orderBy: { category: 'asc' },
  });

  return rows.map((row) => ({ category: row.category, count: row._count }));
}

export async function listForAdmin(query: AdminListQuery) {
  const where = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.published === undefined ? {} : { published: query.published }),
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.galleryImage.findMany({
      where,
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.galleryImage.count({ where }),
  ]);

  return { items, meta: buildPageMeta(query.page, query.limit, total) };
}

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
}

/**
 * Validates, re-encodes and stores a batch of images, then records them.
 *
 * Each file is handled independently: one bad file in a drag-and-drop of ten
 * should not discard the nine good ones, so failures are collected and
 * reported alongside the successes rather than aborting the whole request.
 */
export async function createMany(
  files: UploadedFile[],
  meta: { category: string; altText?: string },
  uploadedById: string,
) {
  const created: unknown[] = [];
  const failed: { filename: string; reason: string }[] = [];

  // New photos go to the top so an admin sees what they just added without
  // scrolling to the end of the archive.
  const lowest = await prisma.galleryImage.aggregate({ _min: { sortOrder: true } });
  let nextSortOrder = (lowest._min.sortOrder ?? 0) - 1;

  for (const file of files) {
    try {
      const detected = detectFileType(file.buffer);

      if (!isImage(detected)) {
        throw new Error(
          `Not a supported image. Accepted formats are ${describeAccepted(IMAGE_TYPES)}.`,
        );
      }

      const processed = await processImage(file.buffer);

      const key = buildStorageKey('gallery', '.webp');
      const thumbKey = thumbnailKeyFor(key);

      const [stored, storedThumb] = await Promise.all([
        storage.put(key, processed.original.buffer, processed.mimeType),
        storage.put(thumbKey, processed.thumbnail.buffer, processed.mimeType),
      ]);

      try {
        const image = await prisma.galleryImage.create({
          data: {
            title: titleFromFilename(file.originalname),
            altText: meta.altText ?? 'Photo from ADEF TVET School',
            category: meta.category,
            storageKey: stored.key,
            url: stored.url,
            thumbnailKey: storedThumb.key,
            thumbnailUrl: storedThumb.url,
            width: processed.original.width,
            height: processed.original.height,
            sizeBytes: processed.original.sizeBytes,
            mimeType: processed.mimeType,
            sortOrder: nextSortOrder--,
            published: true,
            uploadedById,
          },
        });

        await writeAudit(uploadedById, 'CREATE', image.id, { filename: file.originalname });
        created.push(image);
      } catch (dbError) {
        // The files are already written; without this a failed insert would
        // leave two orphans on disk that nothing references.
        await Promise.allSettled([storage.remove(key), storage.remove(thumbKey)]);
        throw dbError;
      }
    } catch (error) {
      failed.push({
        filename: file.originalname,
        reason: error instanceof Error ? error.message : 'Upload failed.',
      });
    }
  }

  if (created.length === 0 && failed.length > 0) {
    throw ApiError.badRequest('None of those files could be uploaded.', {
      files: failed.map((f) => `${f.filename}: ${f.reason}`).join(' · '),
    });
  }

  return { created, failed };
}

/** "welding-workshop-3.jpg" becomes "Welding workshop 3" — a sane starting point. */
function titleFromFilename(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  if (!base) return 'Untitled photo';
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 150);
}

export async function update(id: string, input: UpdateImageInput, actorId: string) {
  await requireImage(id);

  const image = await prisma.galleryImage.update({ where: { id }, data: input });
  await writeAudit(actorId, 'UPDATE', id, input as Record<string, unknown>);

  return image;
}

export async function remove(id: string, actorId: string) {
  const image = await requireImage(id);

  // The row goes first. An orphaned file wastes disk; an orphaned row shows a
  // broken image on the public site, which is the worse failure.
  await prisma.galleryImage.delete({ where: { id } });
  await writeAudit(actorId, 'DELETE', id, { title: image.title, storageKey: image.storageKey });

  const results = await Promise.allSettled([
    storage.remove(image.storageKey),
    image.thumbnailKey ? storage.remove(image.thumbnailKey) : Promise.resolve(),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(`[gallery] could not delete a file for image ${id}:`, result.reason);
    }
  }
}

/**
 * Rewrites the display order from an ordered list of ids.
 *
 * Done in one transaction: a partially applied reorder would leave the gallery
 * in an order nobody chose, which is harder to notice and harder to undo than
 * an outright failure.
 */
export async function reorder(ids: string[], actorId: string) {
  const existing = await prisma.galleryImage.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  if (existing.length !== ids.length) {
    const known = new Set(existing.map((row) => row.id));
    const missing = ids.filter((id) => !known.has(id));
    throw ApiError.badRequest(
      `${missing.length} of those images no longer exist. Refresh the page and try again.`,
    );
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.galleryImage.update({ where: { id }, data: { sortOrder: index } })),
  );

  await writeAudit(actorId, 'UPDATE', null, { action: 'reorder', count: ids.length });

  return { reordered: ids.length };
}

async function requireImage(id: string) {
  const image = await prisma.galleryImage.findUnique({ where: { id } });
  if (!image) throw ApiError.notFound('That photo no longer exists.');
  return image;
}

function writeAudit(
  actorId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityId: string | null,
  meta: Record<string, unknown>,
) {
  return prisma.auditLog.create({
    data: { actorId, action, entity: 'GalleryImage', entityId, meta: meta as never },
  });
}
