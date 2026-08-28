import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { uploadPdfs } from '../../middleware/upload';
import {
  adminListQuerySchema,
  createSchema,
  idParamSchema,
  publicListQuerySchema,
  slugParamSchema,
  updateSchema,
} from './announcements.schema';
import * as controller from './announcements.controller';

export const announcementsPublicRouter = Router();

announcementsPublicRouter.get(
  '/',
  validate({ query: publicListQuerySchema }),
  controller.listPublicHandler,
);

// Before "/:slug" so "attachments" is not read as an announcement address.
announcementsPublicRouter.get(
  '/attachments/:id/download',
  validate({ params: idParamSchema }),
  controller.downloadAttachmentHandler,
);

announcementsPublicRouter.get(
  '/:slug',
  validate({ params: slugParamSchema }),
  controller.getBySlugHandler,
);

export const announcementsAdminRouter = Router();

announcementsAdminRouter.use(requireAuth);

announcementsAdminRouter.get(
  '/',
  validate({ query: adminListQuerySchema }),
  controller.listAdminHandler,
);

announcementsAdminRouter.post('/', validate({ body: createSchema }), controller.createHandler);

announcementsAdminRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  controller.getAdminHandler,
);

announcementsAdminRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateSchema }),
  controller.updateHandler,
);

announcementsAdminRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  controller.deleteHandler,
);

announcementsAdminRouter.post(
  '/:id/attachments',
  validate({ params: idParamSchema }),
  uploadPdfs,
  controller.addAttachmentsHandler,
);

/** Attachments are addressed directly, not under their announcement. */
export const attachmentsAdminRouter = Router();

attachmentsAdminRouter.use(requireAuth);

attachmentsAdminRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  controller.removeAttachmentHandler,
);

export const statsAdminRouter = Router();

statsAdminRouter.use(requireAuth);
statsAdminRouter.get('/', controller.statsHandler);
