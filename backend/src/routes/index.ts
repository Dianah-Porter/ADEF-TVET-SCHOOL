import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { galleryAdminRouter, galleryPublicRouter } from '../modules/gallery/gallery.routes';
import {
  announcementsAdminRouter,
  announcementsPublicRouter,
  attachmentsAdminRouter,
  statsAdminRouter,
} from '../modules/announcements/announcements.routes';
import {
  contentPublicRouter,
  coursesAdminRouter,
  featuresAdminRouter,
  heroAdminRouter,
  settingsAdminRouter,
  testimonialsAdminRouter,
  workingHoursAdminRouter,
} from '../modules/content/content.routes';
import { contactAdminRouter, contactPublicRouter } from '../modules/contact/contact.routes';

/**
 * Everything the API exposes hangs off this router, mounted at /api/v1.
 * Versioning the prefix means a future breaking change can ship as /api/v2
 * without stranding the deployed frontend.
 */
export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);

// Public reads. Everything the website renders comes from here.
apiRouter.use('/gallery', galleryPublicRouter);
apiRouter.use('/announcements', announcementsPublicRouter);
apiRouter.use(contentPublicRouter);

// The one public write.
apiRouter.use('/contact', contactPublicRouter);

// Authenticated writes.
apiRouter.use('/admin/gallery', galleryAdminRouter);
apiRouter.use('/admin/announcements', announcementsAdminRouter);
apiRouter.use('/admin/attachments', attachmentsAdminRouter);
apiRouter.use('/admin/courses', coursesAdminRouter);
apiRouter.use('/admin/testimonials', testimonialsAdminRouter);
apiRouter.use('/admin/hero-slides', heroAdminRouter);
apiRouter.use('/admin/features', featuresAdminRouter);
apiRouter.use('/admin/working-hours', workingHoursAdminRouter);
apiRouter.use('/admin/settings', settingsAdminRouter);
apiRouter.use('/admin/contact', contactAdminRouter);
apiRouter.use('/admin/stats', statsAdminRouter);
