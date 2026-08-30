import { z } from 'zod';

/**
 * Multipart form fields arrive as strings, so anything that is not a string in
 * the database needs coercing here. These two helpers keep that in one place
 * rather than repeated across every create/update schema below.
 */
const formBoolean = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true'));

const formInt = z.coerce.number().int();

const ACCENTS = ['ORANGE', 'GOLD', 'NAVY', 'CHARCOAL'] as const;
const COURSE_ICONS = ['FLAME', 'HAMMER', 'BOX'] as const;
const FEATURE_ICONS = ['AWARD', 'HAND', 'USERS', 'WRENCH', 'BRIEFCASE'] as const;

/** Shared by every admin list screen. */
export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  published: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  search: z.string().trim().min(1).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('That is not a valid id.'),
});

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Send the ordered list of ids.'),
});

// ─── Courses ────────────────────────────────────────────────────────────────

export const createCourseSchema = z.object({
  title: z.string().trim().min(2, 'Give the course a title.').max(120),
  description: z.string().trim().min(10, 'Describe what the course covers.').max(600),
  level: z.string().trim().max(60).optional(),
  duration: z.string().trim().max(60).optional(),
  icon: z.enum(COURSE_ICONS).default('FLAME'),
  accentColor: z.enum(ACCENTS).default('ORANGE'),
  published: formBoolean.default(true),
});

export const updateCourseSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(10).max(600).optional(),
    level: z.string().trim().max(60).nullable().optional(),
    duration: z.string().trim().max(60).nullable().optional(),
    icon: z.enum(COURSE_ICONS).optional(),
    accentColor: z.enum(ACCENTS).optional(),
    published: formBoolean.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

// ─── Testimonials ───────────────────────────────────────────────────────────

export const createTestimonialSchema = z.object({
  name: z.string().trim().min(2, 'Who said it?').max(120),
  course: z.string().trim().min(2, 'Which course did they take?').max(120),
  text: z.string().trim().min(10, 'Add the quote.').max(1000),
  rating: formInt.min(1).max(5).default(5),
  published: formBoolean.default(true),
});

export const updateTestimonialSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    course: z.string().trim().min(2).max(120).optional(),
    text: z.string().trim().min(10).max(1000).optional(),
    rating: formInt.min(1).max(5).optional(),
    published: formBoolean.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

// ─── Hero slides ────────────────────────────────────────────────────────────

/** The image itself is required on create, and is validated by the service. */
export const createHeroSlideSchema = z.object({
  headline: z.string().trim().max(150).optional(),
  subtext: z.string().trim().max(300).optional(),
  published: formBoolean.default(true),
});

export const updateHeroSlideSchema = z
  .object({
    headline: z.string().trim().max(150).nullable().optional(),
    subtext: z.string().trim().max(300).nullable().optional(),
    published: formBoolean.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

// ─── Features ───────────────────────────────────────────────────────────────

export const createFeatureSchema = z.object({
  title: z.string().trim().min(3, 'Give the point a title.').max(150),
  description: z.string().trim().min(5, 'Explain it in a sentence.').max(400),
  icon: z.enum(FEATURE_ICONS).default('AWARD'),
  accentColor: z.enum(ACCENTS).default('GOLD'),
  published: formBoolean.default(true),
});

export const updateFeatureSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),
    description: z.string().trim().min(5).max(400).optional(),
    icon: z.enum(FEATURE_ICONS).optional(),
    accentColor: z.enum(ACCENTS).optional(),
    published: formBoolean.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

// ─── Working hours ──────────────────────────────────────────────────────────

export const createWorkingHoursSchema = z.object({
  day: z.string().trim().min(2, 'Name the day or range of days.').max(60),
  openTime: z.string().trim().max(30).default(''),
  closeTime: z.string().trim().max(30).nullable().optional(),
  isOpen: formBoolean.default(true),
});

export const updateWorkingHoursSchema = z
  .object({
    day: z.string().trim().min(2).max(60).optional(),
    openTime: z.string().trim().max(30).optional(),
    closeTime: z.string().trim().max(30).nullable().optional(),
    isOpen: formBoolean.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

// ─── Site settings ──────────────────────────────────────────────────────────

/**
 * Every field is optional: the settings screen saves whichever section was
 * edited, and demanding the whole document back would mean a stale tab could
 * silently overwrite a colleague change to an unrelated field.
 */
export const updateSettingsSchema = z
  .object({
    schoolName: z.string().trim().min(2).max(120).optional(),
    tagline: z.string().trim().max(200).nullable().optional(),
    vision: z.string().trim().min(5).max(1000).optional(),
    mission: z.string().trim().min(5).max(1000).optional(),
    aboutTitle: z.string().trim().max(200).nullable().optional(),
    aboutText: z.string().trim().min(5).max(2000).optional(),
    aboutText2: z.string().trim().max(2000).nullable().optional(),
    graduatesCount: z.string().trim().max(20).optional(),
    programsCount: formInt.min(0).max(999).optional(),
    phone: z.string().trim().max(40).optional(),
    whatsapp: z.string().trim().max(40).nullable().optional(),
    email: z.string().trim().email('Enter a valid email address.').optional(),
    address: z.string().trim().max(200).optional(),
    mapEmbedUrl: z.string().trim().url('Enter a valid URL.').nullable().optional(),
    instagramUrl: z.string().trim().url('Enter a valid URL.').nullable().optional(),
    twitterUrl: z.string().trim().url('Enter a valid URL.').nullable().optional(),
    workingHoursNote: z.string().trim().max(600).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;
export type CreateHeroSlideInput = z.infer<typeof createHeroSlideSchema>;
export type UpdateHeroSlideInput = z.infer<typeof updateHeroSlideSchema>;
export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
export type CreateWorkingHoursInput = z.infer<typeof createWorkingHoursSchema>;
export type UpdateWorkingHoursInput = z.infer<typeof updateWorkingHoursSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
