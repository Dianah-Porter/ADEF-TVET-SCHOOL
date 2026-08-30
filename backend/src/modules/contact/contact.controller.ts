import type { Request, Response } from 'express';
import { pathParam, validatedQuery } from '../../middleware/validate';
import { created, noContent, ok } from '../../utils/respond';
import * as service from './contact.service';
import type { InboxQuery, SubmitContactInput, UpdateContactInput } from './contact.schema';

export async function submitHandler(req: Request, res: Response) {
  const result = await service.submit(req.body as SubmitContactInput, {
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  });

  return created(res, result);
}

export async function listHandler(req: Request, res: Response) {
  const { items, meta } = await service.listInbox(validatedQuery<InboxQuery>(req));
  const counts = await service.inboxCounts();

  return ok(res, items, { ...meta, counts });
}

export async function updateHandler(req: Request, res: Response) {
  const message = await service.setStatus(
    pathParam(req, 'id'),
    req.body as UpdateContactInput,
    req.user!.sub,
  );

  return ok(res, message);
}

export async function deleteHandler(req: Request, res: Response) {
  await service.remove(pathParam(req, 'id'), req.user!.sub);
  return noContent(res);
}
