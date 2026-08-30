import { prisma } from '../../lib/prisma';
import { recordAudit } from '../../lib/audit';
import { ApiError } from '../../utils/ApiError';
import { buildPageMeta } from '../../utils/respond';
import type { InboxQuery, SubmitContactInput, UpdateContactInput } from './contact.schema';

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

/**
 * Records an enquiry from the website.
 *
 * A filled honeypot returns success without storing anything. Telling a bot it
 * was detected only teaches whoever wrote it to stop filling that field, so
 * the quiet discard is the more useful response.
 */
export async function submit(input: SubmitContactInput, context: RequestContext) {
  if (input.website) {
    return { success: true, message: 'Thank you — we will get back to you shortly.' };
  }

  await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      message: input.message,
      ip: context.ip ?? null,
      userAgent: context.userAgent?.slice(0, 255) ?? null,
    },
  });

  return { success: true, message: 'Thank you — we will get back to you shortly.' };
}

export async function listInbox(query: InboxQuery) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { message: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      // Newest first: an inbox is read from the top.
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        message: true,
        status: true,
        createdAt: true,
        readAt: true,
      },
    }),
    prisma.contactMessage.count({ where }),
  ]);

  return { items, meta: buildPageMeta(query.page, query.limit, total) };
}

/** Counts per status, so the inbox can show them on its filter tabs. */
export async function inboxCounts() {
  const rows = await prisma.contactMessage.groupBy({ by: ['status'], _count: true });

  const counts = { NEW: 0, READ: 0, REPLIED: 0, ARCHIVED: 0, total: 0 };

  for (const row of rows) {
    counts[row.status] = row._count;
    counts.total += row._count;
  }

  return counts;
}

export async function setStatus(id: string, input: UpdateContactInput, actorId: string) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('That message no longer exists.');

  const message = await prisma.contactMessage.update({
    where: { id },
    data: {
      status: input.status,
      // Stamped once, the first time it leaves NEW, so the dashboard can show
      // how long an enquiry sat unread.
      readAt: existing.readAt ?? (input.status === 'NEW' ? null : new Date()),
    },
  });

  await recordAudit({
    actorId,
    action: 'UPDATE',
    entity: 'ContactMessage',
    entityId: id,
    meta: { status: input.status },
  });

  return message;
}

export async function remove(id: string, actorId: string) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('That message no longer exists.');

  await prisma.contactMessage.delete({ where: { id } });

  await recordAudit({
    actorId,
    action: 'DELETE',
    entity: 'ContactMessage',
    entityId: id,
    meta: { from: existing.email },
  });
}
