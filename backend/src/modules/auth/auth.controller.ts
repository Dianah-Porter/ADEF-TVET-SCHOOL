import type { Request, Response } from 'express';
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from '../../lib/tokens';
import { ApiError } from '../../utils/ApiError';
import { ok } from '../../utils/respond';
import * as authService from './auth.service';
import { validatedQuery } from '../../middleware/validate';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from './auth.schema';

function contextFrom(req: Request) {
  return { ip: req.ip, userAgent: req.get('user-agent') ?? undefined };
}

export async function loginHandler(req: Request, res: Response) {
  const result = await authService.login(req.body as LoginInput, contextFrom(req));

  // The refresh token goes in an httpOnly cookie so page scripts cannot read
  // it; only the short-lived access token is handed to the client.
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);

  return ok(res, { user: result.user, accessToken: result.accessToken });
}

export async function refreshHandler(req: Request, res: Response) {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

  if (!presented) {
    throw ApiError.unauthorized('You are not signed in.');
  }

  const result = await authService.refresh(presented, contextFrom(req));

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);

  return ok(res, { user: result.user, accessToken: result.accessToken });
}

export async function logoutHandler(req: Request, res: Response) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined);

  res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });

  return ok(res, { signedOut: true });
}

export async function meHandler(req: Request, res: Response) {
  // requireAuth guarantees req.user is set before this runs.
  const user = await authService.getCurrentUser(req.user!.sub);
  return ok(res, { user });
}

// ─── Password reset ─────────────────────────────────────────────────────────

export async function forgotPasswordHandler(req: Request, res: Response) {
  const result = await authService.requestPasswordReset(
    req.body as ForgotPasswordInput,
    contextFrom(req),
  );

  return ok(res, result);
}

export async function checkResetTokenHandler(req: Request, res: Response) {
  const token = validatedQuery<{ token: string }>(req).token;
  return ok(res, await authService.checkResetToken(token));
}

export async function resetPasswordHandler(req: Request, res: Response) {
  await authService.resetPassword(req.body as ResetPasswordInput, contextFrom(req));

  // The reset revoked every session, including any this browser still holds.
  res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });

  return ok(res, { reset: true });
}

// ─── Profile ────────────────────────────────────────────────────────────────

export async function updateProfileHandler(req: Request, res: Response) {
  const user = await authService.updateProfile(req.user!.sub, req.body as UpdateProfileInput);
  return ok(res, { user });
}

export async function changePasswordHandler(req: Request, res: Response) {
  await authService.changePassword(
    req.user!.sub,
    req.body as ChangePasswordInput,
    req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
  );

  return ok(res, { changed: true });
}
