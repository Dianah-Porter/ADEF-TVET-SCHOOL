import { del, head, put } from '@vercel/blob';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import type { StorageDriver, StoredFile } from './StorageDriver';

/**
 * Stores uploads in Vercel Blob.
 *
 * This exists because a serverless deployment has no durable disk. On Vercel
 * the filesystem is read-only apart from /tmp, and /tmp is thrown away when the
 * instance is recycled — so LocalDriver would appear to work, return a URL, and
 * then serve a 404 minutes later. Anything deployed there needs object storage,
 * and Blob is the one that needs no extra account.
 *
 * Swapping this for S3 or Cloudinary means writing one more class against
 * StorageDriver and adding a case to createDriver(); nothing outside this
 * folder knows where files physically live.
 */
export class VercelBlobDriver implements StorageDriver {
  constructor(
    private readonly token: string,
    /** Public origin of the store, e.g. https://abc123.public.blob.vercel-storage.com */
    private readonly baseUrl: string,
  ) {}

  /**
   * Keys are generated server-side as `gallery/2026/08/<uuid>.webp`, and
   * `addRandomSuffix: false` keeps them verbatim.
   *
   * That matters: the database stores the key, and every later delete has to
   * find the same object. Letting Blob append its own suffix would mean the
   * stored key no longer addressed the file.
   */
  async put(key: string, data: Buffer, contentType: string): Promise<StoredFile> {
    const result = await put(key, data, {
      access: 'public',
      contentType,
      token: this.token,
      addRandomSuffix: false,
      // Uploads are immutable — the filename is a UUID that never refers to
      // different bytes — so they can be cached for a year.
      cacheControlMaxAge: 31_536_000,
    });

    return { key, url: result.url, sizeBytes: data.length };
  }

  async remove(key: string): Promise<void> {
    try {
      await del(this.url(key), { token: this.token });
    } catch (error) {
      // Already gone is the desired end state, not a failure — the same
      // contract LocalDriver honours for ENOENT.
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('not found') || message.includes('404')) return;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await head(this.url(key), { token: this.token });
      return true;
    } catch {
      return false;
    }
  }

  url(key: string): string {
    // Keys are built with forward slashes, but a Windows path join can leave
    // backslashes behind, and those are not valid in a URL.
    const normalised = key.split('\\').join('/');

    if (normalised.startsWith('/') || normalised.includes('..')) {
      throw ApiError.badRequest('Invalid storage key.');
    }

    return `${this.baseUrl.replace(/\/$/, '')}/${normalised}`;
  }
}

/**
 * Reads the two settings this driver needs, failing at boot rather than on the
 * first upload.
 *
 * A misconfigured store that only reveals itself when a member of staff tries
 * to add a photo is far worse than a server that refuses to start.
 */
export function blobConfigOrThrow(): { token: string; baseUrl: string } {
  const token = env.BLOB_READ_WRITE_TOKEN;
  const baseUrl = env.BLOB_BASE_URL;

  if (!token || !baseUrl) {
    throw new Error(
      'STORAGE_DRIVER is "vercel-blob" but BLOB_READ_WRITE_TOKEN and BLOB_BASE_URL are not both set.\n' +
        'Create a Blob store in the Vercel dashboard (Storage → Create → Blob); connecting it to the\n' +
        'project sets BLOB_READ_WRITE_TOKEN for you. BLOB_BASE_URL is the store\'s public origin,\n' +
        'which looks like https://<store-id>.public.blob.vercel-storage.com',
    );
  }

  return { token, baseUrl };
}
