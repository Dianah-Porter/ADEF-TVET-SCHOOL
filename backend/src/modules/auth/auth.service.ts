import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword, wasteTimeLikeAVerification } from '../../lib/password';
import {
  generateRefreshToken,
  generateResetToken,
  hashRefreshToken,
  hashResetToken,
  refreshTokenExpiry,
  resetTokenExpiry,
  signAccessToken,
  type AccessTokenPayload,
} from '../../lib/tokens';
import { env } from '../../config/env';
import { mailer, passwordResetEmail } from '../../lib/mailer';
import { recordAudit } from '../../lib/audit';
import { ApiError } from '../../utils/ApiError';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from './auth.schema';

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export interface AuthResult {
  user: { id: string; email: string; name: string; role: AccessTokenPayload['role'] };
  accessToken: string;
  refreshToken: string;
}

/**
 * Deliberately identical for "no such account" and "wrong password" — both the
 * message and, thanks to the dummy verification, the time taken. Telling the
 * two apart would let anyone enumerate which staff emails exist.
 */
const INVALID_CREDENTIALS = 'That email and password combination is not correct.';

export async function login(input: LoginInput, context: RequestContext): Promise<AuthResult> {
  const user = await prisma.adminUser.findUnique({ where: { email: input.email } });

  if (!user) {
    await wasteTimeLikeAVerification();
    throw ApiError.unauthorized(INVALID_CREDENTIALS);
  }

  const passwordMatches = await verifyPassword(user.passwordHash, input.password);

  if (!passwordMatches) {
    await prisma.auditLog.create({
      data: { actorId: user.id, action: 'LOGIN_FAILED', entity: 'AdminUser', entityId: user.id },
    });
    throw ApiError.unauthorized(INVALID_CREDENTIALS);
  }

  // Checked after the password so a disabled account cannot be identified
  // without also knowing its password.
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Contact an administrator.');
  }

  const refreshToken = await issueRefreshToken(user.id, context);

  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.auditLog.create({
      data: { actorId: user.id, action: 'LOGIN', entity: 'AdminUser', entityId: user.id },
    }),
  ]);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken: signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }),
    refreshToken,
  };
}

async function issueRefreshToken(userId: string, context: RequestContext): Promise<string> {
  const token = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(token),
      userId,
      expiresAt: refreshTokenExpiry(),
      ip: context.ip ?? null,
      userAgent: context.userAgent?.slice(0, 255) ?? null,
    },
  });

  return token;
}

/**
 * Rotates a refresh token: the presented one is revoked and a fresh one issued.
 *
 * Presenting an already-revoked token means either a stolen token is being
 * replayed or the real one was intercepted. Either way we cannot tell which
 * party is legitimate, so every session for that user is killed.
 */
export async function refresh(presentedToken: string, context: RequestContext): Promise<AuthResult> {
  const tokenHash = hashRefreshToken(presentedToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.');
  }

  if (stored.revokedAt) {
    // A token revoked by LOGOUT being presented again is ordinary: a tab that
    // was still open retried after the user signed out. Say so plainly and
    // leave their other devices alone.
    if (stored.revokedReason === 'LOGOUT') {
      throw ApiError.unauthorized('You have been signed out. Please sign in again.');
    }

    // A token revoked by ROTATION, however, should never be seen again — the
    // client replaced it. Replay means a copy exists somewhere it should not,
    // and we cannot tell which holder is the real user, so end every session.
    await prisma.$transaction([
      prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'REUSE_DETECTED' },
      }),
      prisma.auditLog.create({
        data: {
          actorId: stored.userId,
          action: 'DELETE',
          entity: 'RefreshToken',
          entityId: stored.id,
          meta: { reason: 'refresh token reuse detected; all sessions revoked' },
        },
      }),
    ]);

    throw ApiError.unauthorized(
      'Your session was ended for security reasons. Please sign in again.',
    );
  }

  if (stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Your session expired. Please sign in again.');
  }

  if (!stored.user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), revokedReason: 'ROTATED' },
  });

  const nextToken = await issueRefreshToken(stored.userId, context);
  const { user } = stored;

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken: signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }),
    refreshToken: nextToken,
  };
}

export async function logout(presentedToken: string | undefined): Promise<void> {
  if (!presentedToken) return;

  // updateMany rather than update: logging out with an unknown token should
  // quietly succeed, not 404.
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(presentedToken), revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
  });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('This account is no longer active.');
  }

  return user;
}

// ─── Password reset ─────────────────────────────────────────────────────────

/**
 * The same answer for every email address, real or not.
 *
 * Saying "no account with that email" would turn this endpoint into a way to
 * discover which staff addresses exist, which is exactly what the login route
 * goes to some trouble to prevent.
 */
const RESET_REQUESTED =
  'If that email belongs to a staff account, a reset link is on its way.';

export async function requestPasswordReset(
  input: ForgotPasswordInput,
  context: RequestContext,
): Promise<{ message: string }> {
  const user = await prisma.adminUser.findUnique({ where: { email: input.email } });

  // A deactivated account is treated as a missing one: it should not be
  // possible to reactivate yourself through the reset flow.
  if (!user || !user.isActive) {
    // Keeps the response time in the same range as the real path, so timing
    // does not reveal what the message deliberately does not.
    await wasteTimeLikeAVerification();
    return { message: RESET_REQUESTED };
  }

  // Any earlier link is invalidated. Two live links would mean an old email —
  // possibly the one an attacker triggered — still works after the real user
  // has requested their own.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const token = generateResetToken();

  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashResetToken(token),
      userId: user.id,
      expiresAt: resetTokenExpiry(),
      ip: context.ip ?? null,
      userAgent: context.userAgent?.slice(0, 255) ?? null,
    },
  });

  const resetUrl = `${env.APP_URL.replace(/\/$/, '')}/admin/reset-password?token=${token}`;
  const email = passwordResetEmail({
    name: user.name,
    resetUrl,
    ttlMinutes: env.PASSWORD_RESET_TTL_MINUTES,
  });

  try {
    await mailer.send({ ...email, to: user.email });
  } catch (error) {
    // The token is already stored, so a mail failure is logged rather than
    // surfaced: telling the caller that sending failed would leak that the
    // address exists.
    console.error('[auth] could not send the password reset email:', error);
  }

  await recordAudit({
    actorId: user.id,
    action: 'PASSWORD_RESET_REQUESTED',
    entity: 'AdminUser',
    entityId: user.id,
    meta: { ip: context.ip ?? null },
  });

  return { message: RESET_REQUESTED };
}

/**
 * Checks a link before showing the "choose a new password" form.
 *
 * Without this the user would type a new password twice and only then be told
 * the link had expired.
 */
export async function checkResetToken(token: string): Promise<{ email: string; name: string }> {
  const stored = await findUsableResetToken(token);
  return { email: stored.user.email, name: stored.user.name };
}

export async function resetPassword(
  input: ResetPasswordInput,
  context: RequestContext,
): Promise<void> {
  const stored = await findUsableResetToken(input.token);
  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: stored.userId },
      data: { passwordHash },
    }),
    // Single use.
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    // Whoever set this password is the only one who should still be signed in.
    // If the reset was prompted by a suspected compromise, leaving existing
    // sessions alive would defeat the point of resetting at all.
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
    }),
  ]);

  await recordAudit({
    actorId: stored.userId,
    action: 'PASSWORD_RESET',
    entity: 'AdminUser',
    entityId: stored.userId,
    meta: { ip: context.ip ?? null },
  });
}

async function findUsableResetToken(token: string) {
  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: true },
  });

  // One message for missing, used and expired alike — the user's next step is
  // the same in all three cases, and distinguishing them tells a stranger
  // holding a stale link which kind of stale it is.
  const invalid = ApiError.badRequest(
    'That reset link is no longer valid. Request a new one and try again.',
  );

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) throw invalid;
  if (!stored.user.isActive) throw invalid;

  return stored;
}

// ─── Profile ────────────────────────────────────────────────────────────────

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  if (input.email) {
    const taken = await prisma.adminUser.findUnique({ where: { email: input.email } });

    if (taken && taken.id !== userId) {
      throw ApiError.conflict('Another account already uses that email address.');
    }
  }

  const user = await prisma.adminUser.update({
    where: { id: userId },
    data: input,
    select: { id: true, email: true, name: true, role: true },
  });

  await recordAudit({
    actorId: userId,
    action: 'UPDATE',
    entity: 'AdminUser',
    entityId: userId,
    meta: { fields: Object.keys(input) },
  });

  return user;
}

/**
 * Changing your own password from inside the dashboard.
 *
 * The current password is required even though the caller is already
 * authenticated: it is what stops an unattended, still-signed-in browser from
 * being used to lock the real owner out of their account.
 */
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  currentRefreshToken: string | undefined,
): Promise<void> {
  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.unauthorized('This account is no longer active.');

  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw ApiError.badRequest('That is not your current password.', {
      currentPassword: 'That is not your current password.',
    });
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: userId }, data: { passwordHash } }),
    // Every other session is ended, but not this one: signing someone out of
    // the tab they are actively using to change their password is a bug, not
    // a security measure.
    prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(currentRefreshToken
          ? { tokenHash: { not: hashRefreshToken(currentRefreshToken) } }
          : {}),
      },
      data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
    }),
  ]);

  await recordAudit({
    actorId: userId,
    action: 'PASSWORD_RESET',
    entity: 'AdminUser',
    entityId: userId,
    meta: { self: true },
  });
}
