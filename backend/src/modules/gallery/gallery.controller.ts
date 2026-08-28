import type { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError';
import { created, noContent, ok, paginated } from '../../utils/respond';
import { pathParam, validatedQuery } from '../../middleware/validate';
import * as galleryService from './gallery.service';
import type { AdminListQuery, ListQuery, UpdateImageInput } from './gallery.schema';

export async function listPublicHandler(req: Request, res: Response) {
  const result = await galleryService.listPublic(validatedQuery<ListQuery>(req));
  return paginated(res, result.items, result.meta);
}

export async function listCategoriesHandler(_req: Request, res: Response) {
  return ok(res, await galleryService.listCategories());
}

export async function listAdminHandler(req: Request, res: Response) {
  const result = await galleryService.listForAdmin(validatedQuery<AdminListQuery>(req));
  return paginated(res, result.items, result.meta);
}

export async function uploadHandler(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  if (files.length === 0) {
    throw ApiError.badRequest('Choose at least one image to upload.', {
      images: 'No files were received.',
    });
  }

  const result = await galleryService.createMany(
    files.map((file) => ({ originalname: file.originalname, buffer: file.buffer })),
    req.body as { category: string; altText?: string },
    req.user!.sub,
  );

  // 207-ish situation without inventing a status: a partial success is still a
  // success, but the response says exactly which files did not make it so the
  // dashboard can show them rather than silently dropping them.
  return created(res, result);
}

export async function updateHandler(req: Request, res: Response) {
  const image = await galleryService.update(
    pathParam(req, 'id'),
    req.body as UpdateImageInput,
    req.user!.sub,
  );
  return ok(res, image);
}

export async function deleteHandler(req: Request, res: Response) {
  await galleryService.remove(pathParam(req, 'id'), req.user!.sub);
  return noContent(res);
}

export async function reorderHandler(req: Request, res: Response) {
  const { ids } = req.body as { ids: string[] };
  return ok(res, await galleryService.reorder(ids, req.user!.sub));
}
