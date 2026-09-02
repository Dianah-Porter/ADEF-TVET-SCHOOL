import { prisma } from '../../lib/prisma';
import type { Prisma } from '../../generated/prisma/client';
import { recordAudit } from '../../lib/audit';
import { detectFileType, isImage, IMAGE_TYPES, describeAccepted } from '../../lib/fileType';
import { processImage } from '../../lib/imageProcessor';
import { slugify } from '../../lib/slug';
import { storage, buildStorageKey, type StorageFolder } from '../../storage';
import { ApiError } from '../../utils/ApiError';
import type {
  AdminListQuery,
  CreateCourseInput,
  CreateFeatureInput,
  CreateHeroSlideInput,
  CreateTestimonialInput,
  CreateWorkingHoursInput,
  UpdateCourseInput,
  UpdateFeatureInput,
  UpdateHeroSlideInput,
  UpdateSettingsInput,
  UpdateTestimonialInput,
  UpdateWorkingHoursInput,
} from './content.schema';

// ─── Presentation helpers ───────────────────────────────────────────────────

/**
 * The database stores enums in SCREAMING_CASE; the website expects the lucide
 * icon name ("Flame") and a lowercase colour token ("orange").
 *
 * Translating here rather than in the frontend means the enum can be renamed
 * in one place, and the public JSON stays a contract the site can render
 * without knowing anything about Prisma.
 */
function toIconName(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function toAccent(value: string): string {
  return value.toLowerCase();
}

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
}

/**
 * Validates and re-encodes one uploaded image, then stores it.
 *
 * Re-encoding is not optional politeness: it strips EXIF (including the GPS
 * coordinates phone cameras embed by default) and destroys anything hidden in
 * a file that merely looks like an image.
 */
async function storeImage(file: UploadedFile, folder: StorageFolder) {
  const detected = detectFileType(file.buffer);

  if (!isImage(detected)) {
    throw ApiError.badRequest(
      `That is not a supported image. Accepted formats are ${describeAccepted(IMAGE_TYPES)}.`,
      { image: 'Unsupported image format.' },
    );
  }

  const processed = await processImage(file.buffer);
  const key = buildStorageKey(folder, '.webp');
  const stored = await storage.put(key, processed.original.buffer, processed.mimeType);

  return {
    key: stored.key,
    url: stored.url,
    width: processed.original.width,
    height: processed.original.height,
    sizeBytes: processed.original.sizeBytes,
    mimeType: processed.mimeType,
  };
}

/** Removes a stored file without letting a storage failure fail the request. */
async function discardImage(key: string | null | undefined, context: string) {
  if (!key) return;

  try {
    await storage.remove(key);
  } catch (error) {
    console.error(`[content] could not delete ${key} for ${context}:`, error);
  }
}

/**
 * New items go to the top of the list.
 *
 * An admin who has just added a course expects to see it, not to scroll past
 * everything added before it.
 */
async function nextSortOrder(
  aggregate: () => Promise<{ _min: { sortOrder: number | null } }>,
): Promise<number> {
  const lowest = await aggregate();
  return (lowest._min.sortOrder ?? 0) - 1;
}

function buildWhere(query: AdminListQuery, searchFields: string[]) {
  return {
    ...(query.published === undefined ? {} : { published: query.published }),
    ...(query.search
      ? {
          OR: searchFields.map((field) => ({
            [field]: { contains: query.search, mode: 'insensitive' as const },
          })),
        }
      : {}),
  };
}

const listOrder = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }];

// ─── Courses ────────────────────────────────────────────────────────────────

export async function listPublicCourses() {
  const rows = await prisma.course.findMany({
    where: { published: true },
    orderBy: listOrder,
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl ?? '',
    level: row.level ?? undefined,
    duration: row.duration ?? undefined,
    iconName: toIconName(row.icon),
    accentColor: toAccent(row.accentColor),
  }));
}

export function listAdminCourses(query: AdminListQuery) {
  return prisma.course.findMany({
    where: buildWhere(query, ['title', 'description']),
    orderBy: listOrder,
  });
}

export async function createCourse(
  input: CreateCourseInput,
  file: UploadedFile | undefined,
  actorId: string,
) {
  const image = file ? await storeImage(file, 'courses') : null;

  try {
    const course = await prisma.course.create({
      data: {
        ...input,
        slug: await uniqueCourseSlug(input.title),
        imageKey: image?.key ?? null,
        imageUrl: image?.url ?? null,
        sortOrder: await nextSortOrder(() => prisma.course.aggregate({ _min: { sortOrder: true } })),
      },
    });

    await recordAudit({
      actorId,
      action: 'CREATE',
      entity: 'Course',
      entityId: course.id,
      meta: { title: course.title },
    });

    return course;
  } catch (error) {
    // The file is already on disk; without this a failed insert leaves an
    // orphan nothing references.
    await discardImage(image?.key, 'a course that failed to save');
    throw error;
  }
}

export async function updateCourse(
  id: string,
  input: UpdateCourseInput,
  file: UploadedFile | undefined,
  actorId: string,
) {
  const existing = await requireRow(prisma.course.findUnique({ where: { id } }), 'course');
  const image = file ? await storeImage(file, 'courses') : null;

  const course = await prisma.course.update({
    where: { id },
    data: {
      ...input,
      // The slug is deliberately not regenerated from a new title: links
      // already shared with students keep working.
      ...(image ? { imageKey: image.key, imageUrl: image.url } : {}),
    },
  });

  if (image) await discardImage(existing.imageKey, `the replaced image of course ${id}`);

  await recordAudit({
    actorId,
    action: 'UPDATE',
    entity: 'Course',
    entityId: id,
    meta: { ...input, imageReplaced: Boolean(image) },
  });

  return course;
}

export async function removeCourse(id: string, actorId: string) {
  const existing = await requireRow(prisma.course.findUnique({ where: { id } }), 'course');

  await prisma.course.delete({ where: { id } });
  await discardImage(existing.imageKey, `deleted course ${id}`);

  await recordAudit({
    actorId,
    action: 'DELETE',
    entity: 'Course',
    entityId: id,
    meta: { title: existing.title },
  });
}

/** Courses get slugs for the same reason announcements do — shareable links. */
async function uniqueCourseSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);

  for (let suffix = 1; suffix < 100; suffix++) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const taken = await prisma.course.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!taken || taken.id === excludeId) return candidate;
  }

  return `${base}-${Date.now()}`;
}

// ─── Testimonials ───────────────────────────────────────────────────────────

export async function listPublicTestimonials() {
  const rows = await prisma.testimonial.findMany({
    where: { published: true },
    orderBy: listOrder,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    course: row.course,
    text: row.text,
    rating: row.rating,
    avatarUrl: row.avatarUrl ?? undefined,
  }));
}

export function listAdminTestimonials(query: AdminListQuery) {
  return prisma.testimonial.findMany({
    where: buildWhere(query, ['name', 'course', 'text']),
    orderBy: listOrder,
  });
}

export async function createTestimonial(
  input: CreateTestimonialInput,
  file: UploadedFile | undefined,
  actorId: string,
) {
  const avatar = file ? await storeImage(file, 'testimonials') : null;

  try {
    const testimonial = await prisma.testimonial.create({
      data: {
        ...input,
        avatarKey: avatar?.key ?? null,
        avatarUrl: avatar?.url ?? null,
        sortOrder: await nextSortOrder(() =>
          prisma.testimonial.aggregate({ _min: { sortOrder: true } }),
        ),
      },
    });

    await recordAudit({
      actorId,
      action: 'CREATE',
      entity: 'Testimonial',
      entityId: testimonial.id,
      meta: { name: testimonial.name },
    });

    return testimonial;
  } catch (error) {
    await discardImage(avatar?.key, 'a testimonial that failed to save');
    throw error;
  }
}

export async function updateTestimonial(
  id: string,
  input: UpdateTestimonialInput,
  file: UploadedFile | undefined,
  actorId: string,
) {
  const existing = await requireRow(prisma.testimonial.findUnique({ where: { id } }), 'testimonial');
  const avatar = file ? await storeImage(file, 'testimonials') : null;

  const testimonial = await prisma.testimonial.update({
    where: { id },
    data: { ...input, ...(avatar ? { avatarKey: avatar.key, avatarUrl: avatar.url } : {}) },
  });

  if (avatar) await discardImage(existing.avatarKey, `the replaced avatar of testimonial ${id}`);

  await recordAudit({ actorId, action: 'UPDATE', entity: 'Testimonial', entityId: id, meta: input });

  return testimonial;
}

export async function removeTestimonial(id: string, actorId: string) {
  const existing = await requireRow(prisma.testimonial.findUnique({ where: { id } }), 'testimonial');

  await prisma.testimonial.delete({ where: { id } });
  await discardImage(existing.avatarKey, `deleted testimonial ${id}`);

  await recordAudit({
    actorId,
    action: 'DELETE',
    entity: 'Testimonial',
    entityId: id,
    meta: { name: existing.name },
  });
}

// ─── Hero slides ────────────────────────────────────────────────────────────

export async function listPublicHeroSlides() {
  const rows = await prisma.heroSlide.findMany({
    where: { published: true },
    orderBy: listOrder,
  });

  return rows.map((row) => ({
    id: row.id,
    imageUrl: row.imageUrl,
    headline: row.headline ?? undefined,
    subtext: row.subtext ?? undefined,
  }));
}

export function listAdminHeroSlides(query: AdminListQuery) {
  return prisma.heroSlide.findMany({
    where: buildWhere(query, ['headline', 'subtext']),
    orderBy: listOrder,
  });
}

export async function createHeroSlide(
  input: CreateHeroSlideInput,
  file: UploadedFile | undefined,
  actorId: string,
) {
  if (!file) {
    throw ApiError.badRequest('A hero slide needs an image.', {
      image: 'Choose an image for this slide.',
    });
  }

  const image = await storeImage(file, 'hero');

  try {
    const slide = await prisma.heroSlide.create({
      data: {
        ...input,
        storageKey: image.key,
        imageUrl: image.url,
        width: image.width,
        height: image.height,
        sizeBytes: image.sizeBytes,
        mimeType: image.mimeType,
        sortOrder: await nextSortOrder(() =>
          prisma.heroSlide.aggregate({ _min: { sortOrder: true } }),
        ),
      },
    });

    await recordAudit({ actorId, action: 'CREATE', entity: 'HeroSlide', entityId: slide.id });

    return slide;
  } catch (error) {
    await discardImage(image.key, 'a hero slide that failed to save');
    throw error;
  }
}

export async function updateHeroSlide(
  id: string,
  input: UpdateHeroSlideInput,
  file: UploadedFile | undefined,
  actorId: string,
) {
  const existing = await requireRow(prisma.heroSlide.findUnique({ where: { id } }), 'hero slide');
  const image = file ? await storeImage(file, 'hero') : null;

  const slide = await prisma.heroSlide.update({
    where: { id },
    data: {
      ...input,
      ...(image
        ? {
            storageKey: image.key,
            imageUrl: image.url,
            width: image.width,
            height: image.height,
            sizeBytes: image.sizeBytes,
            mimeType: image.mimeType,
          }
        : {}),
    },
  });

  if (image) await discardImage(existing.storageKey, `the replaced image of hero slide ${id}`);

  await recordAudit({ actorId, action: 'UPDATE', entity: 'HeroSlide', entityId: id, meta: input });

  return slide;
}

export async function removeHeroSlide(id: string, actorId: string) {
  const existing = await requireRow(prisma.heroSlide.findUnique({ where: { id } }), 'hero slide');

  await prisma.heroSlide.delete({ where: { id } });
  await discardImage(existing.storageKey, `deleted hero slide ${id}`);

  await recordAudit({ actorId, action: 'DELETE', entity: 'HeroSlide', entityId: id });
}

// ─── Features ───────────────────────────────────────────────────────────────

export async function listPublicFeatures() {
  const rows = await prisma.feature.findMany({ where: { published: true }, orderBy: listOrder });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    iconName: toIconName(row.icon),
    accentColor: toAccent(row.accentColor),
  }));
}

export function listAdminFeatures(query: AdminListQuery) {
  return prisma.feature.findMany({
    where: buildWhere(query, ['title', 'description']),
    orderBy: listOrder,
  });
}

export async function createFeature(input: CreateFeatureInput, actorId: string) {
  const feature = await prisma.feature.create({
    data: {
      ...input,
      sortOrder: await nextSortOrder(() => prisma.feature.aggregate({ _min: { sortOrder: true } })),
    },
  });

  await recordAudit({
    actorId,
    action: 'CREATE',
    entity: 'Feature',
    entityId: feature.id,
    meta: { title: feature.title },
  });

  return feature;
}

export async function updateFeature(id: string, input: UpdateFeatureInput, actorId: string) {
  await requireRow(prisma.feature.findUnique({ where: { id } }), 'item');

  const feature = await prisma.feature.update({ where: { id }, data: input });
  await recordAudit({ actorId, action: 'UPDATE', entity: 'Feature', entityId: id, meta: input });

  return feature;
}

export async function removeFeature(id: string, actorId: string) {
  const existing = await requireRow(prisma.feature.findUnique({ where: { id } }), 'item');

  await prisma.feature.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: 'DELETE',
    entity: 'Feature',
    entityId: id,
    meta: { title: existing.title },
  });
}

// ─── Working hours ──────────────────────────────────────────────────────────

export async function listWorkingHours() {
  const rows = await prisma.workingHours.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return rows.map((row) => ({
    id: row.id,
    day: row.day,
    openTime: row.openTime,
    closeTime: row.closeTime,
    isOpen: row.isOpen,
  }));
}

export async function createWorkingHours(input: CreateWorkingHoursInput, actorId: string) {
  // Opening hours read top to bottom as a week, so a new row belongs at the
  // end — the opposite of the content lists above.
  const highest = await prisma.workingHours.aggregate({ _max: { sortOrder: true } });

  const row = await prisma.workingHours.create({
    data: { ...input, sortOrder: (highest._max.sortOrder ?? -1) + 1 },
  });

  await recordAudit({
    actorId,
    action: 'CREATE',
    entity: 'WorkingHours',
    entityId: row.id,
    meta: { day: row.day },
  });

  return row;
}

export async function updateWorkingHours(
  id: string,
  input: UpdateWorkingHoursInput,
  actorId: string,
) {
  await requireRow(prisma.workingHours.findUnique({ where: { id } }), 'row');

  const row = await prisma.workingHours.update({ where: { id }, data: input });
  await recordAudit({
    actorId,
    action: 'UPDATE',
    entity: 'WorkingHours',
    entityId: id,
    meta: input,
  });

  return row;
}

export async function removeWorkingHours(id: string, actorId: string) {
  const existing = await requireRow(prisma.workingHours.findUnique({ where: { id } }), 'row');

  await prisma.workingHours.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: 'DELETE',
    entity: 'WorkingHours',
    entityId: id,
    meta: { day: existing.day },
  });
}

// ─── Site settings ──────────────────────────────────────────────────────────

/**
 * The values the site falls back to before anyone has edited them.
 *
 * They match what used to be hard-coded in the frontend, so a fresh database
 * renders the real ADEF website rather than a page of placeholders.
 */
const SETTINGS_DEFAULTS = {
  schoolName: 'ADEF TVET School',
  tagline: 'Technical & Vocational Education',
  vision: 'To become the Referral TVET School in East Africa.',
  mission:
    'Empower and prepare students to deliver on high level standards of hands-on skills to meet local and international labour market.',
  aboutTitle: 'Leading Technical & Vocational Training Institution',
  aboutText:
    'ADEF TVET School is dedicated to providing world-class technical and vocational education that bridges the gap between classroom learning and real-world industry demands.',
  aboutText2:
    'Our institution focuses on practical, industry-ready education that empowers students with the hands-on skills and knowledge needed to excel in local and international labor markets.',
  graduatesCount: '100+',
  programsCount: 3,
  phone: '+250 789 895 800',
  whatsapp: '+250789895800',
  email: 'info@adeftvet.org',
  address: 'NR5, Kigali, Rwanda',
  mapEmbedUrl: null,
  instagramUrl: 'https://instagram.com/adef_tvet_school',
  twitterUrl: 'https://twitter.com/AdefTvet',
  workingHoursNote:
    'Our admissions office is available during all operating hours. Walk-ins are welcome, but appointments are recommended for detailed consultations.',
} as const;

const SETTINGS_ID = 'site';

/**
 * Settings are one row that always exists.
 *
 * Upserting on read means neither the public site nor the dashboard has to
 * handle "no settings yet" — there is no such state after the first request.
 */
export function getSettings() {
  return prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID, ...SETTINGS_DEFAULTS },
  });
}

export async function updateSettings(input: UpdateSettingsInput, actorId: string) {
  const settings = await prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: input,
    create: { id: SETTINGS_ID, ...SETTINGS_DEFAULTS, ...input },
  });

  await recordAudit({
    actorId,
    action: 'UPDATE',
    entity: 'SiteSettings',
    entityId: SETTINGS_ID,
    meta: { fields: Object.keys(input) },
  });

  return settings;
}

// ─── Ordering ───────────────────────────────────────────────────────────────

type Orderable = 'course' | 'testimonial' | 'heroSlide' | 'feature' | 'workingHours';

const ENTITY_NAMES: Record<Orderable, string> = {
  course: 'Course',
  testimonial: 'Testimonial',
  heroSlide: 'HeroSlide',
  feature: 'Feature',
  workingHours: 'WorkingHours',
};

/**
 * Rewrites display order from an ordered list of ids, in one transaction.
 *
 * A half-applied reorder would leave the site in an order nobody chose, which
 * is harder to notice and to undo than an outright failure.
 */
export async function reorder(model: Orderable, ids: string[], actorId: string) {
  // Prisma delegates share a shape but not a type, so the model is narrowed to
  // just the two calls used here. update() must keep its PrismaPromise type or
  // $transaction will not accept the batch.
  const delegate = prisma[model] as unknown as {
    findMany: (args: unknown) => Promise<{ id: string }[]>;
    update: (args: unknown) => Prisma.PrismaPromise<unknown>;
  };

  const existing = await delegate.findMany({ where: { id: { in: ids } }, select: { id: true } });

  if (existing.length !== ids.length) {
    const known = new Set(existing.map((row) => row.id));
    const missing = ids.filter((id) => !known.has(id));

    throw ApiError.badRequest(
      `${missing.length} of those items no longer exist. Refresh the page and try again.`,
    );
  }

  await prisma.$transaction(
    ids.map((id, index) => delegate.update({ where: { id }, data: { sortOrder: index } })),
  );

  await recordAudit({
    actorId,
    action: 'UPDATE',
    entity: ENTITY_NAMES[model],
    meta: { action: 'reorder', count: ids.length },
  });

  return { reordered: ids.length };
}

// ─── Shared ─────────────────────────────────────────────────────────────────

async function requireRow<T>(query: Promise<T | null>, label: string): Promise<T> {
  const row = await query;
  if (!row) throw ApiError.notFound(`That ${label} no longer exists.`);
  return row;
}
