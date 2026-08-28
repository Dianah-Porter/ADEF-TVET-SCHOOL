import multer from 'multer';
import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_PDF_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGES_PER_REQUEST = 10;
export const MAX_PDFS_PER_REQUEST = 5;

/**
 * Files are buffered in memory rather than written to a temp directory.
 *
 * Every upload is validated and re-encoded before it is stored, so writing the
 * raw bytes to disk first would mean briefly persisting unvalidated,
 * attacker-supplied content. The size caps keep memory use bounded.
 */
const memory = multer.memoryStorage();

export const uploadImages = multer({
  storage: memory,
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES_PER_REQUEST },
}).array('images', MAX_IMAGES_PER_REQUEST);

export const uploadPdfs = multer({
  storage: memory,
  limits: { fileSize: MAX_PDF_BYTES, files: MAX_PDFS_PER_REQUEST },
}).array('documents', MAX_PDFS_PER_REQUEST);

/**
 * Multer signals its limits with its own error class. Left alone these surface
 * as opaque 500s, so they are translated into the same envelope as everything
 * else, with a message that says what to actually do about it.
 */
export const uploadErrorHandler: ErrorRequestHandler = (err, _req, _res, next) => {
  if (!(err instanceof multer.MulterError)) return next(err);

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return next(
        ApiError.payloadTooLarge(
          `That file is too large. Images must be under ${MAX_IMAGE_BYTES / 1024 / 1024} MB and PDFs under ${MAX_PDF_BYTES / 1024 / 1024} MB.`,
        ),
      );
    case 'LIMIT_FILE_COUNT':
      return next(ApiError.badRequest('Too many files in one upload. Send fewer and try again.'));
    case 'LIMIT_UNEXPECTED_FILE':
      return next(
        ApiError.badRequest(
          `Unexpected form field "${err.field}". Images go in "images", documents in "documents".`,
        ),
      );
    default:
      return next(ApiError.badRequest(`Upload failed: ${err.message}`));
  }
};
