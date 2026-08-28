import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { created, noContent, ok, paginated } from '../../utils/respond';
import { pathParam, validatedQuery } from '../../middleware/validate';
import * as service from './announcements.service';
import type {
  AdminListQuery,
  CreateInput,
  PublicListQuery,
  UpdateInput,
} from './announcements.schema';

export async function listPublicHandler(req: Request, res: Response) {
  const result = await service.listPublic(validatedQuery<PublicListQuery>(req));
  return paginated(res, result.items, result.meta);
}

export async function getBySlugHandler(req: Request, res: Response) {
  return ok(res, await service.getBySlug(pathParam(req, 'slug')));
}

/**
 * Serves an attachment with its original filename.
 *
 * The static /uploads route cannot do this: on disk the file is a UUID, and the
 * name a person should see lives in the database. Streaming it here is what
 * makes a download arrive as "term-3-calendar.pdf" rather than a hex string.
 */
export async function downloadAttachmentHandler(req: Request, res: Response) {
  const attachment = await service.getDownloadable(pathParam(req, 'id'));
  const absolutePath = path.resolve(env.uploadRoot, attachment.storageKey);

  if (!fs.existsSync(absolutePath)) {
    throw ApiError.notFound('That document is no longer available.');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // res.download sets Content-Disposition: attachment and escapes the filename.
  return res.download(absolutePath, attachment.filename);
}

export async function listAdminHandler(req: Request, res: Response) {
  const result = await service.listForAdmin(validatedQuery<AdminListQuery>(req));
  return paginated(res, result.items, result.meta);
}

export async function getAdminHandler(req: Request, res: Response) {
  return ok(res, await service.getForAdmin(pathParam(req, 'id')));
}

export async function createHandler(req: Request, res: Response) {
  const announcement = await service.create(req.body as CreateInput, req.user!.sub);
  return created(res, announcement);
}

export async function updateHandler(req: Request, res: Response) {
  const announcement = await service.update(
    pathParam(req, 'id'),
    req.body as UpdateInput,
    req.user!.sub,
  );
  return ok(res, announcement);
}

export async function deleteHandler(req: Request, res: Response) {
  await service.remove(pathParam(req, 'id'), req.user!.sub);
  return noContent(res);
}

export async function addAttachmentsHandler(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  if (files.length === 0) {
    throw ApiError.badRequest('Choose at least one PDF to attach.', {
      documents: 'No files were received.',
    });
  }

  const result = await service.addAttachments(
    pathParam(req, 'id'),
    files.map((file) => ({ originalname: file.originalname, buffer: file.buffer })),
    req.user!.sub,
  );

  return created(res, result);
}

export async function removeAttachmentHandler(req: Request, res: Response) {
  await service.removeAttachment(pathParam(req, 'id'), req.user!.sub);
  return noContent(res);
}

export async function statsHandler(_req: Request, res: Response) {
  return ok(res, await service.stats());
}
