import type { Request, Response } from 'express';
import { pathParam, validatedQuery } from '../../middleware/validate';
import { created, noContent, ok } from '../../utils/respond';
import * as service from './content.service';
import type {
  AdminListQuery,
  CreateCourseInput,
  CreateFeatureInput,
  CreateHeroSlideInput,
  CreateTestimonialInput,
  CreateWorkingHoursInput,
  UpdateCourseInput,
  UpdateFeatureInput,
  UpdateHeroSlideInput,
  UpdateSettingsInput,
  UpdateTestimonialInput,
  UpdateWorkingHoursInput,
} from './content.schema';

/** requireAuth guarantees req.user on every admin route below. */
function actor(req: Request): string {
  return req.user!.sub;
}

/**
 * Multer puts a single upload on req.file. It is optional everywhere except
 * hero slides, where the service rejects a missing image.
 */
function uploaded(req: Request): service.UploadedFile | undefined {
  return req.file ? { originalname: req.file.originalname, buffer: req.file.buffer } : undefined;
}

function listQuery(req: Request): AdminListQuery {
  return validatedQuery<AdminListQuery>(req);
}

// ─── Public reads ───────────────────────────────────────────────────────────

export async function publicCoursesHandler(_req: Request, res: Response) {
  return ok(res, await service.listPublicCourses());
}

export async function publicTestimonialsHandler(_req: Request, res: Response) {
  return ok(res, await service.listPublicTestimonials());
}

export async function publicHeroHandler(_req: Request, res: Response) {
  return ok(res, await service.listPublicHeroSlides());
}

export async function publicFeaturesHandler(_req: Request, res: Response) {
  return ok(res, await service.listPublicFeatures());
}

export async function publicWorkingHoursHandler(_req: Request, res: Response) {
  return ok(res, await service.listWorkingHours());
}

export async function publicSettingsHandler(_req: Request, res: Response) {
  return ok(res, await service.getSettings());
}

// ─── Courses ────────────────────────────────────────────────────────────────

export async function listCoursesHandler(req: Request, res: Response) {
  return ok(res, await service.listAdminCourses(listQuery(req)));
}

export async function createCourseHandler(req: Request, res: Response) {
  const course = await service.createCourse(
    req.body as CreateCourseInput,
    uploaded(req),
    actor(req),
  );
  return created(res, course);
}

export async function updateCourseHandler(req: Request, res: Response) {
  const course = await service.updateCourse(
    pathParam(req, 'id'),
    req.body as UpdateCourseInput,
    uploaded(req),
    actor(req),
  );
  return ok(res, course);
}

export async function deleteCourseHandler(req: Request, res: Response) {
  await service.removeCourse(pathParam(req, 'id'), actor(req));
  return noContent(res);
}

export async function reorderCoursesHandler(req: Request, res: Response) {
  const { ids } = req.body as { ids: string[] };
  return ok(res, await service.reorder('course', ids, actor(req)));
}

// ─── Testimonials ───────────────────────────────────────────────────────────

export async function listTestimonialsHandler(req: Request, res: Response) {
  return ok(res, await service.listAdminTestimonials(listQuery(req)));
}

export async function createTestimonialHandler(req: Request, res: Response) {
  const testimonial = await service.createTestimonial(
    req.body as CreateTestimonialInput,
    uploaded(req),
    actor(req),
  );
  return created(res, testimonial);
}

export async function updateTestimonialHandler(req: Request, res: Response) {
  const testimonial = await service.updateTestimonial(
    pathParam(req, 'id'),
    req.body as UpdateTestimonialInput,
    uploaded(req),
    actor(req),
  );
  return ok(res, testimonial);
}

export async function deleteTestimonialHandler(req: Request, res: Response) {
  await service.removeTestimonial(pathParam(req, 'id'), actor(req));
  return noContent(res);
}

export async function reorderTestimonialsHandler(req: Request, res: Response) {
  const { ids } = req.body as { ids: string[] };
  return ok(res, await service.reorder('testimonial', ids, actor(req)));
}

// ─── Hero slides ────────────────────────────────────────────────────────────

export async function listHeroHandler(req: Request, res: Response) {
  return ok(res, await service.listAdminHeroSlides(listQuery(req)));
}

export async function createHeroHandler(req: Request, res: Response) {
  const slide = await service.createHeroSlide(
    req.body as CreateHeroSlideInput,
    uploaded(req),
    actor(req),
  );
  return created(res, slide);
}

export async function updateHeroHandler(req: Request, res: Response) {
  const slide = await service.updateHeroSlide(
    pathParam(req, 'id'),
    req.body as UpdateHeroSlideInput,
    uploaded(req),
    actor(req),
  );
  return ok(res, slide);
}

export async function deleteHeroHandler(req: Request, res: Response) {
  await service.removeHeroSlide(pathParam(req, 'id'), actor(req));
  return noContent(res);
}

export async function reorderHeroHandler(req: Request, res: Response) {
  const { ids } = req.body as { ids: string[] };
  return ok(res, await service.reorder('heroSlide', ids, actor(req)));
}

// ─── Features ───────────────────────────────────────────────────────────────

export async function listFeaturesHandler(req: Request, res: Response) {
  return ok(res, await service.listAdminFeatures(listQuery(req)));
}

export async function createFeatureHandler(req: Request, res: Response) {
  return created(res, await service.createFeature(req.body as CreateFeatureInput, actor(req)));
}

export async function updateFeatureHandler(req: Request, res: Response) {
  const feature = await service.updateFeature(
    pathParam(req, 'id'),
    req.body as UpdateFeatureInput,
    actor(req),
  );
  return ok(res, feature);
}

export async function deleteFeatureHandler(req: Request, res: Response) {
  await service.removeFeature(pathParam(req, 'id'), actor(req));
  return noContent(res);
}

export async function reorderFeaturesHandler(req: Request, res: Response) {
  const { ids } = req.body as { ids: string[] };
  return ok(res, await service.reorder('feature', ids, actor(req)));
}

// ─── Working hours ──────────────────────────────────────────────────────────

export async function listWorkingHoursHandler(_req: Request, res: Response) {
  return ok(res, await service.listWorkingHours());
}

export async function createWorkingHoursHandler(req: Request, res: Response) {
  const row = await service.createWorkingHours(req.body as CreateWorkingHoursInput, actor(req));
  return created(res, row);
}

export async function updateWorkingHoursHandler(req: Request, res: Response) {
  const row = await service.updateWorkingHours(
    pathParam(req, 'id'),
    req.body as UpdateWorkingHoursInput,
    actor(req),
  );
  return ok(res, row);
}

export async function deleteWorkingHoursHandler(req: Request, res: Response) {
  await service.removeWorkingHours(pathParam(req, 'id'), actor(req));
  return noContent(res);
}

export async function reorderWorkingHoursHandler(req: Request, res: Response) {
  const { ids } = req.body as { ids: string[] };
  return ok(res, await service.reorder('workingHours', ids, actor(req)));
}

// ─── Site settings ──────────────────────────────────────────────────────────

export async function getSettingsHandler(_req: Request, res: Response) {
  return ok(res, await service.getSettings());
}

export async function updateSettingsHandler(req: Request, res: Response) {
  return ok(res, await service.updateSettings(req.body as UpdateSettingsInput, actor(req)));
}
