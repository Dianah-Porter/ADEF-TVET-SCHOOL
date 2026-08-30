import { prisma } from './prisma';
import type { AuditAction } from '../generated/prisma/enums';

/**
 * Records who changed what.
 *
 * Deliberately fire-and-forget at the call site: an audit row failing to write
 * must never turn a successful edit into an error the user sees. The failure is
 * logged instead, which is the only thing that can usefully be done about it.
 */
export async function recordAudit(input: {
  actorId: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: (input.meta ?? undefined) as never,
      },
    });
  } catch (error) {
    console.error('[audit] could not write an audit entry:', error);
  }
}
