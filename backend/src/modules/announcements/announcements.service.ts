import { prisma } from '../../lib/prisma';
import { uniqueSlug } from '../../lib/slug';
import { buildExcerpt, sanitizeBody, toPlainText } from '../../lib/sanitize';
import { detectFileType } from '../../lib/fileType';
import { storage, buildStorageKey } from '../../storage';
import { ApiError } from '../../utils/ApiError';
import { buildPageMeta } from '../../utils/respond';
import type { AdminListQuery, CreateInput, PublicListQuery, UpdateInput } from './announcements.schema';

const attachmentFields = {
  id: true,
  filename: true,
  url: true,
  sizeBytes: true,
  mimeType: true,
} as const;

const publicFields = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  type: true,
  pinned: true,
  publishedAt: true,
  attachments: { select: attachmentFields },
} as const;

/**
 * Pinned first, then newest. Both directions are explicit so the order never
 * depends on how Postgres happens to return rows.
 */
const publicOrder = [{ pinned: 'desc' as const }, { publishedAt: 'desc' as const }];

export async function listPublic(query: PublicListQuery) {
  const where = {
    status: 'PUBLISHED' as const,
    ...(query.type ? { type: query.type } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      select: publicFields,
      orderBy: publicOrder,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { items, meta: buildPageMeta(query.page, query.limit, total) };
}

export async function getBySlug(slug: string) {
  const announcement = await prisma.announcement.findUnique({
    where: { slug },
    select: { ...publicFields, body: true, status: true },
  });

  // A draft must 404 rather than 403 — telling the world that a hidden
  // announcement exists at this address is itself a leak.
  if (!announcement || announcement.status !== 'PUBLISHED') {
    throw ApiError.notFound('That announcement does not exist.');
  }

  const { status: _status, ...rest } = announcement;
  return rest;
}

export async function listForAdmin(query: AdminListQuery) {
  const where = {
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        attachments: { select: attachmentFields },
      },
      // Drafts have no publishedAt, so admin listing falls back to updatedAt —
      // otherwise every draft would sort together at the bottom.
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { items, meta: buildPageMeta(query.page, query.limit, total) };
}

export async function getForAdmin(id: string) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      attachments: { select: attachmentFields },
    },
  });

  if (!announcement) throw ApiError.notFound('That announcement no longer exists.');
  return announcement;
}

export async function create(input: CreateInput, authorId: string) {
  const body = sanitizeBody(input.body);

  if (!toPlainText(body)) {
    throw ApiError.badRequest('The announcement is empty once formatting is removed.', {
      body: 'Write some text.',
    });
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      slug: await uniqueSlug(input.title),
      body,
      excerpt: input.excerpt || buildExcerpt(body),
      type: input.type,
      status: input.status,
      pinned: input.pinned,
      publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      authorId,
    },
    include: { attachments: { select: attachmentFields } },
  });

  await writeAudit(authorId, 'CREATE', announcement.id, { title: announcement.title });
  return announcement;
}

export async function update(id: string, input: UpdateInput, actorId: string) {
  const existing = await getForAdmin(id);

  const body = input.body === undefined ? undefined : sanitizeBody(input.body);

  if (body !== undefined && !toPlainText(body)) {
    throw ApiError.badRequest('The announcement is empty once formatting is removed.', {
      body: 'Write some text.',
    });
  }

  const goingLive = input.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(body === undefined ? {} : { body }),
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
      // An explicit excerpt wins; clearing it regenerates from the new body.
      ...(input.excerpt === undefined
        ? body === undefined
          ? {}
          : { excerpt: buildExcerpt(body) }
        : { excerpt: input.excerpt || buildExcerpt(body ?? existing.body) }),

      // Set the first time it goes live and never again, so re-publishing
      // after a correction does not shuffle it back to the top of the list.
      ...(goingLive && !existing.publishedAt ? { publishedAt: new Date() } : {}),

      // The slug is deliberately NOT regenerated when the title changes: links
      // already shared with students and parents must keep working.
    },
    include: {
      author: { select: { id: true, name: true } },
      attachments: { select: attachmentFields },
    },
  });

  await writeAudit(actorId, 'UPDATE', id, input as Record<string, unknown>);
  return announcement;
}

export async function remove(id: string, actorId: string) {
  const existing = await getForAdmin(id);

  // Attachments cascade in the database; their files do not, so collect the
  // keys before the row disappears.
  const keys = existing.attachments.map((a) => a.id);
  const stored = await prisma.attachment.findMany({
    where: { id: { in: keys } },
    select: { storageKey: true },
  });

  await prisma.announcement.delete({ where: { id } });
  await writeAudit(actorId, 'DELETE', id, { title: existing.title });

  for (const { storageKey } of stored) {
    await storage.remove(storageKey).catch((error) => {
      console.error(`[announcements] could not delete ${storageKey}:`, error);
    });
  }
}

export interface UploadedDocument {
  originalname: string;
  buffer: Buffer;
}

export async function addAttachments(
  announcementId: string,
  files: UploadedDocument[],
  actorId: string,
) {
  await getForAdmin(announcementId);

  const created: unknown[] = [];
  const failed: { filename: string; reason: string }[] = [];

  for (const file of files) {
    try {
      if (detectFileType(file.buffer) !== 'application/pdf') {
        throw new Error('Only PDF documents can be attached.');
      }

      const key = buildStorageKey('docs', '.pdf');
      const stored = await storage.put(key, file.buffer, 'application/pdf');

      try {
        const attachment = await prisma.attachment.create({
          data: {
            announcementId,
            // Kept for the download filename only. The stored file is a UUID,
            // so nothing in this string can affect where it lands on disk.
            filename: safeDownloadName(file.originalname),
            storageKey: stored.key,
            url: stored.url,
            mimeType: 'application/pdf',
            sizeBytes: stored.sizeBytes,
          },
          select: attachmentFields,
        });

        created.push(attachment);
      } catch (dbError) {
        await storage.remove(key).catch(() => {});
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
    throw ApiError.badRequest('None of those documents could be attached.', {
      documents: failed.map((f) => `${f.filename}: ${f.reason}`).join(' · '),
    });
  }

  await writeAudit(actorId, 'UPDATE', announcementId, {
    action: 'attachments added',
    count: created.length,
  });

  return { created, failed };
}

export async function removeAttachment(attachmentId: string, actorId: string) {
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) throw ApiError.notFound('That document is no longer attached.');

  await prisma.attachment.delete({ where: { id: attachmentId } });
  await writeAudit(actorId, 'UPDATE', attachment.announcementId, {
    action: 'attachment removed',
    filename: attachment.filename,
  });

  await storage.remove(attachment.storageKey).catch((error) => {
    console.error(`[announcements] could not delete ${attachment.storageKey}:`, error);
  });
}

/** The attachment a public download route is allowed to serve. */
export async function getDownloadable(attachmentId: string) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { announcement: { select: { status: true } } },
  });

  // A PDF attached to a draft is not public yet, even if someone has the id.
  if (!attachment || attachment.announcement.status !== 'PUBLISHED') {
    throw ApiError.notFound('That document is not available.');
  }

  return attachment;
}

/**
 * Strips anything that could break out of a Content-Disposition header or a
 * directory. This name is only ever echoed back to the browser, never used to
 * build a path, but a filename carrying a quote or a newline could otherwise
 * be used to inject a header.
 */
function safeDownloadName(original: string): string {
  const base = original.split(/[/\\]/).pop() ?? 'document.pdf';
  const cleaned = base
    // \p{Cc} and \p{Cf} are the Unicode control and format categories, which
    // together cover NUL, CR and LF — the characters that could split or
    // inject a Content-Disposition header.
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/["\\]/g, '')
    .trim();
  const withExt = /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;

  return withExt.slice(0, 200) || 'document.pdf';
}

export async function stats() {
  const [images, published, drafts, attachments, recent, size] = await Promise.all([
    prisma.galleryImage.count(),
    prisma.announcement.count({ where: { status: 'PUBLISHED' } }),
    prisma.announcement.count({ where: { status: 'DRAFT' } }),
    prisma.attachment.count(),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { name: true } } },
    }),
    prisma.galleryImage.aggregate({ _sum: { sizeBytes: true } }),
  ]);

  return {
    galleryImages: images,
    publishedAnnouncements: published,
    draftAnnouncements: drafts,
    attachments,
    storageBytes: size._sum.sizeBytes ?? 0,
    recentActivity: recent.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entity: entry.entity,
      actor: entry.actor?.name ?? 'System',
      at: entry.createdAt,
    })),
  };
}

function writeAudit(
  actorId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityId: string | null,
  meta: Record<string, unknown>,
) {
  return prisma.auditLog.create({
    data: { actorId, action, entity: 'Announcement', entityId, meta: meta as never },
  });
}
