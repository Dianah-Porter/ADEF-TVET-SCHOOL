import { z } from 'zod';

const TYPES = ['NEWS', 'EVENT', 'NOTICE'] as const;
const STATUSES = ['DRAFT', 'PUBLISHED'] as const;

export const publicListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  type: z.enum(TYPES).optional(),
});

export const adminListQuerySchema = publicListQuerySchema.extend({
  status: z.enum(STATUSES).optional(),
  search: z.string().trim().min(1).optional(),
});

export const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'That is not a valid announcement address.'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('That is not a valid announcement id.'),
});

export const createSchema = z.object({
  title: z.string().trim().min(3, 'Give the announcement a title.').max(200),
  body: z.string().trim().min(1, 'Write the announcement.'),
  excerpt: z.string().trim().max(300).optional(),
  type: z.enum(TYPES).default('NEWS'),
  // New announcements start as drafts unless explicitly published, so nothing
  // reaches the public site by a slip of the keyboard.
  status: z.enum(STATUSES).default('DRAFT'),
  pinned: z.boolean().default(false),
});

export const updateSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    body: z.string().trim().min(1).optional(),
    excerpt: z.string().trim().max(300).nullable().optional(),
    type: z.enum(TYPES).optional(),
    status: z.enum(STATUSES).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

export type PublicListQuery = z.infer<typeof publicListQuerySchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
