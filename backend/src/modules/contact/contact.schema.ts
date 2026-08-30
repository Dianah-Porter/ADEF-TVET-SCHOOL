import { z } from 'zod';

const STATUSES = ['NEW', 'READ', 'REPLIED', 'ARCHIVED'] as const;

/**
 * What the website's contact form sends.
 *
 * `website` is a honeypot: it is rendered off-screen and hidden from screen
 * readers, so a person never fills it in and a bot that fills every field
 * does. Anything non-empty here is dropped by the service.
 */
export const submitContactSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, 'Write your message.').max(3000),
  // Not .max(0): rejecting a filled honeypot with a validation error tells
  // whoever wrote the bot exactly which field gave them away. Anything is
  // accepted here and the service discards the submission silently.
  website: z.string().max(200).optional(),
});

export const inboxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(STATUSES).optional(),
  search: z.string().trim().min(1).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('That is not a valid message id.'),
});

export const updateContactSchema = z.object({
  status: z.enum(STATUSES),
});

export type SubmitContactInput = z.infer<typeof submitContactSchema>;
export type InboxQuery = z.infer<typeof inboxQuerySchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
