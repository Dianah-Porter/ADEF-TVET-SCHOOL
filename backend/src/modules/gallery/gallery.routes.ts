import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { uploadImages } from '../../middleware/upload';
import {
  adminListQuerySchema,
  idParamSchema,
  listQuerySchema,
  reorderSchema,
  updateImageSchema,
  uploadMetaSchema,
} from './gallery.schema';
import * as controller from './gallery.controller';

/** Anyone may read the published gallery — this is what the website renders. */
export const galleryPublicRouter = Router();

galleryPublicRouter.get(
  '/',
  validate({ query: listQuerySchema }),
  controller.listPublicHandler,
);
galleryPublicRouter.get('/categories', controller.listCategoriesHandler);

/** Everything below requires a signed-in administrator. */
export const galleryAdminRouter = Router();

galleryAdminRouter.use(requireAuth);

galleryAdminRouter.get(
  '/',
  validate({ query: adminListQuerySchema }),
  controller.listAdminHandler,
);

galleryAdminRouter.post(
  '/',
  // multer must run before validate: the metadata fields do not exist on
  // req.body until the multipart body has been parsed.
  uploadImages,
  validate({ body: uploadMetaSchema }),
  controller.uploadHandler,
);

// Declared before "/:id" so that "reorder" is not captured as an id.
galleryAdminRouter.patch(
  '/reorder',
  validate({ body: reorderSchema }),
  controller.reorderHandler,
);

galleryAdminRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateImageSchema }),
  controller.updateHandler,
);

galleryAdminRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  controller.deleteHandler,
);
