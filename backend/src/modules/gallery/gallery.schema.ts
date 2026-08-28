import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  category: z.string().trim().min(1).optional(),
});

export const adminListQuerySchema = listQuerySchema.extend({
  /** Admins can also see drafts; omitting this returns both. */
  published: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  search: z.string().trim().min(1).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('That is not a valid image id.'),
});

/**
 * Fields sent alongside an upload. They arrive as multipart form fields, so
 * everything is a string until it is coerced here.
 */
export const uploadMetaSchema = z.object({
  category: z.string().trim().min(1).max(60).default('Campus'),
  altText: z.string().trim().min(1).max(300).optional(),
});

export const updateImageSchema = z
  .object({
    title: z.string().trim().min(1, 'Give the photo a title.').max(150).optional(),
    caption: z.string().trim().max(500).nullable().optional(),
    altText: z
      .string()
      .trim()
      .min(1, 'Alt text describes the photo for people using screen readers.')
      .max(300)
      .optional(),
    category: z.string().trim().min(1).max(60).optional(),
    published: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Nothing to update.',
  });

export const reorderSchema = z.object({
  /** Every published-or-not image id, in the order they should appear. */
  ids: z.array(z.string().uuid()).min(1, 'Send the ordered list of image ids.'),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type UpdateImageInput = z.infer<typeof updateImageSchema>;
