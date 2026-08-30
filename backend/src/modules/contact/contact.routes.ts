import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { contactRateLimit } from '../../middleware/rateLimit';
import {
  idParamSchema,
  inboxQuerySchema,
  submitContactSchema,
  updateContactSchema,
} from './contact.schema';
import * as controller from './contact.controller';

/** The website's contact form posts here. */
export const contactPublicRouter = Router();

contactPublicRouter.post(
  '/',
  contactRateLimit,
  validate({ body: submitContactSchema }),
  controller.submitHandler,
);

/** The dashboard inbox. */
export const contactAdminRouter = Router();

contactAdminRouter.use(requireAuth);

contactAdminRouter.get('/', validate({ query: inboxQuerySchema }), controller.listHandler);

contactAdminRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateContactSchema }),
  controller.updateHandler,
);

contactAdminRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  controller.deleteHandler,
);
