import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { loginRateLimit, passwordResetRateLimit } from '../../middleware/rateLimit';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  resetTokenSchema,
  updateProfileSchema,
} from './auth.schema';
import * as controller from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', loginRateLimit, validate({ body: loginSchema }), controller.loginHandler);
authRouter.post('/refresh', controller.refreshHandler);
authRouter.post('/logout', controller.logoutHandler);
authRouter.get('/me', requireAuth, controller.meHandler);

// ─── Password reset ─────────────────────────────────────────────────────────
// Unauthenticated by definition — someone using these cannot sign in.

authRouter.post(
  '/forgot-password',
  passwordResetRateLimit,
  validate({ body: forgotPasswordSchema }),
  controller.forgotPasswordHandler,
);

// Checked before the form is shown, so an expired link is reported up front
// rather than after the user has typed a new password twice.
authRouter.get(
  '/reset-password',
  validate({ query: resetTokenSchema }),
  controller.checkResetTokenHandler,
);

authRouter.post(
  '/reset-password',
  passwordResetRateLimit,
  validate({ body: resetPasswordSchema }),
  controller.resetPasswordHandler,
);

// ─── Profile ────────────────────────────────────────────────────────────────

authRouter.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  controller.updateProfileHandler,
);

authRouter.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  controller.changePasswordHandler,
);
