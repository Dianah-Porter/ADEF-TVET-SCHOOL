import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { uploadSingleImage } from '../../middleware/upload';
import {
  adminListQuerySchema,
  createCourseSchema,
  createFeatureSchema,
  createHeroSlideSchema,
  createTestimonialSchema,
  createWorkingHoursSchema,
  idParamSchema,
  reorderSchema,
  updateCourseSchema,
  updateFeatureSchema,
  updateHeroSlideSchema,
  updateSettingsSchema,
  updateTestimonialSchema,
  updateWorkingHoursSchema,
} from './content.schema';
import * as controller from './content.controller';

/**
 * What the website reads. All of it is public and unauthenticated — this is
 * the page content itself, and the shapes are already the ones the frontend
 * renders, so no client-side translation is needed.
 */
export const contentPublicRouter = Router();

contentPublicRouter.get('/courses', controller.publicCoursesHandler);
contentPublicRouter.get('/testimonials', controller.publicTestimonialsHandler);
contentPublicRouter.get('/hero-slides', controller.publicHeroHandler);
contentPublicRouter.get('/features', controller.publicFeaturesHandler);
contentPublicRouter.get('/working-hours', controller.publicWorkingHoursHandler);
contentPublicRouter.get('/settings', controller.publicSettingsHandler);

/**
 * Builds the five near-identical admin routers.
 *
 * Every content type needs the same six routes, differing only in their
 * schemas and handlers. Writing them out five times would be five chances to
 * forget requireAuth or to put "/reorder" after "/:id" — where Express would
 * read "reorder" as an id and the route would silently 400.
 */
function contentAdminRouter(options: {
  list: import('express').RequestHandler;
  create: import('express').RequestHandler;
  update: import('express').RequestHandler;
  remove: import('express').RequestHandler;
  reorder: import('express').RequestHandler;
  createSchema: Parameters<typeof validate>[0]['body'];
  updateSchema: Parameters<typeof validate>[0]['body'];
  /** Set for the types that carry a picture. */
  withImage?: boolean;
}) {
  const router = Router();

  router.use(requireAuth);

  router.get('/', validate({ query: adminListQuerySchema }), options.list);

  // Declared before "/:id" so "reorder" is never captured as an id.
  router.patch('/reorder', validate({ body: reorderSchema }), options.reorder);

  if (options.withImage) {
    // multer must run before validate: with a multipart body the text fields
    // do not exist on req.body until it has been parsed.
    router.post(
      '/',
      uploadSingleImage,
      validate({ body: options.createSchema }),
      options.create,
    );
    router.patch(
      '/:id',
      uploadSingleImage,
      validate({ params: idParamSchema, body: options.updateSchema }),
      options.update,
    );
  } else {
    router.post('/', validate({ body: options.createSchema }), options.create);
    router.patch(
      '/:id',
      validate({ params: idParamSchema, body: options.updateSchema }),
      options.update,
    );
  }

  router.delete('/:id', validate({ params: idParamSchema }), options.remove);

  return router;
}

export const coursesAdminRouter = contentAdminRouter({
  list: controller.listCoursesHandler,
  create: controller.createCourseHandler,
  update: controller.updateCourseHandler,
  remove: controller.deleteCourseHandler,
  reorder: controller.reorderCoursesHandler,
  createSchema: createCourseSchema,
  updateSchema: updateCourseSchema,
  withImage: true,
});

export const testimonialsAdminRouter = contentAdminRouter({
  list: controller.listTestimonialsHandler,
  create: controller.createTestimonialHandler,
  update: controller.updateTestimonialHandler,
  remove: controller.deleteTestimonialHandler,
  reorder: controller.reorderTestimonialsHandler,
  createSchema: createTestimonialSchema,
  updateSchema: updateTestimonialSchema,
  withImage: true,
});

export const heroAdminRouter = contentAdminRouter({
  list: controller.listHeroHandler,
  create: controller.createHeroHandler,
  update: controller.updateHeroHandler,
  remove: controller.deleteHeroHandler,
  reorder: controller.reorderHeroHandler,
  createSchema: createHeroSlideSchema,
  updateSchema: updateHeroSlideSchema,
  withImage: true,
});

export const featuresAdminRouter = contentAdminRouter({
  list: controller.listFeaturesHandler,
  create: controller.createFeatureHandler,
  update: controller.updateFeatureHandler,
  remove: controller.deleteFeatureHandler,
  reorder: controller.reorderFeaturesHandler,
  createSchema: createFeatureSchema,
  updateSchema: updateFeatureSchema,
});

export const workingHoursAdminRouter = contentAdminRouter({
  list: controller.listWorkingHoursHandler,
  create: controller.createWorkingHoursHandler,
  update: controller.updateWorkingHoursHandler,
  remove: controller.deleteWorkingHoursHandler,
  reorder: controller.reorderWorkingHoursHandler,
  createSchema: createWorkingHoursSchema,
  updateSchema: updateWorkingHoursSchema,
});

/** Settings are a single row, so they get read/write rather than CRUD. */
export const settingsAdminRouter = Router();

settingsAdminRouter.use(requireAuth);
settingsAdminRouter.get('/', controller.getSettingsHandler);
settingsAdminRouter.patch(
  '/',
  validate({ body: updateSettingsSchema }),
  controller.updateSettingsHandler,
);
