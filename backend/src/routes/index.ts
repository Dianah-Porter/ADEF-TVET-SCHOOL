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

/**
 * Everything the API exposes hangs off this router, mounted at /api/v1.
 * Versioning the prefix means a future breaking change can ship as /api/v2
 * without stranding the deployed frontend.
 */
export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);

// Public reads.
apiRouter.use('/gallery', galleryPublicRouter);
apiRouter.use('/announcements', announcementsPublicRouter);

// Authenticated writes.
apiRouter.use('/admin/gallery', galleryAdminRouter);
apiRouter.use('/admin/announcements', announcementsAdminRouter);
apiRouter.use('/admin/attachments', attachmentsAdminRouter);
apiRouter.use('/admin/stats', statsAdminRouter);
