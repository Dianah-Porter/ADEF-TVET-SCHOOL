import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimit } from './middleware/rateLimit';
import { uploadErrorHandler } from './middleware/upload';
import { ApiError } from './utils/ApiError';

export function createApp() {
  const app = express();

  // Behind a proxy (Render, Railway, nginx) this makes req.ip and secure
  // cookies resolve correctly instead of always seeing the proxy's address.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Images and PDFs are served from this origin but embedded by the
      // frontend on another one, so the default same-origin policy is too tight.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin requests and curl send no Origin header at all.
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        callback(ApiError.forbidden(`Origin ${origin} is not allowed to call this API.`));
      },
      credentials: true, // required for the refresh-token cookie
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  if (!env.isProduction) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Uploaded media. Filenames are UUIDs that never change contents, so these
  // can be cached hard. `index: false` keeps the directory unlistable — nobody
  // should be able to enumerate the archive by browsing to /uploads/.
  app.use(
    '/uploads',
    express.static(env.uploadRoot, {
      index: false,
      dotfiles: 'deny',
      maxAge: '1y',
      immutable: true,
      setHeaders(res, filePath) {
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Never let a stored file be rendered as a document in the user's
        // origin; a PDF is something to download, not to execute inline.
        if (path.extname(filePath).toLowerCase() === '.pdf') {
          res.setHeader('Content-Disposition', 'attachment');
        }
      },
    }),
  );

  app.use('/api/v1', apiRateLimit, apiRouter);

  app.use(uploadErrorHandler);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
