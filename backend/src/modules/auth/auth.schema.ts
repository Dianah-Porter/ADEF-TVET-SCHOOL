import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

/**
 * The one rule every new password goes through.
 *
 * Length is the requirement that actually matters; character-class rules mostly
 * produce "Passw0rd!" and a sticky note. Twelve characters is the OWASP
 * recommendation for an account with no second factor.
 */
const newPassword = z
  .string()
  .min(12, 'Use at least 12 characters — a short phrase works well.')
  .max(200, 'That password is too long.');

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export const resetTokenSchema = z.object({
  token: z.string().trim().min(20, 'That reset link is not valid.'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20, 'That reset link is not valid.'),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((value) => value.currentPassword !== value.password, {
    message: 'Choose a password different from your current one.',
    path: ['password'],
  });

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name.').max(120).optional(),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.').optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
