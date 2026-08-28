import sharp from 'sharp';
import { ApiError } from '../utils/ApiError';

/** Longest edge of a stored original. Beyond this is wasted bytes on a website. */
const MAX_EDGE = 2000;
const THUMBNAIL_WIDTH = 480;

export interface ProcessedImage {
  original: { buffer: Buffer; width: number; height: number; sizeBytes: number };
  thumbnail: { buffer: Buffer; sizeBytes: number };
  mimeType: 'image/webp';
}

/**
 * Normalises an uploaded image into a web-ready original plus a thumbnail.
 *
 * Three things happen here that all matter:
 *
 *  - `.rotate()` with no argument applies the EXIF orientation flag and then
 *    drops it, so a photo taken sideways on a phone is stored the right way up
 *    rather than relying on the browser to interpret the flag.
 *
 *  - Re-encoding discards ALL metadata. That includes GPS coordinates, which
 *    phone cameras embed by default. The gallery is a public page and the
 *    subjects are students, so shipping the location of every photo would be a
 *    genuine privacy problem.
 *
 *  - Decoding and re-encoding also destroys anything hidden in the original
 *    container. A file that survives magic-byte checks but is not really an
 *    image fails here instead.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  try {
    const pipeline = sharp(input, { failOn: 'error' }).rotate();

    const { data, info } = await pipeline
      .clone()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    const thumbnail = await pipeline
      .clone()
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    return {
      original: {
        buffer: data,
        width: info.width,
        height: info.height,
        sizeBytes: data.length,
      },
      thumbnail: { buffer: thumbnail, sizeBytes: thumbnail.length },
      mimeType: 'image/webp',
    };
  } catch (error) {
    throw ApiError.badRequest(
      'That image could not be processed. It may be corrupted or in an unsupported format.',
      { file: error instanceof Error ? error.message : 'Unreadable image data.' },
    );
  }
}
