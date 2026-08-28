import { prisma } from '../../lib/prisma';
import { verifyPassword, wasteTimeLikeAVerification } from '../../lib/password';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
  type AccessTokenPayload,
} from '../../lib/tokens';
import { ApiError } from '../../utils/ApiError';
import type { LoginInput } from './auth.schema';

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
