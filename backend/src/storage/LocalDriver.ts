import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import type { StorageDriver, StoredFile } from './StorageDriver';

export class LocalDriver implements StorageDriver {
  constructor(private readonly root: string = env.uploadRoot) {}

  /**
   * Resolves a key to an absolute path and refuses to escape the upload root.
   *
   * Keys are generated server-side so they should always be safe, but this is
   * the single place a bad key could become an arbitrary filesystem write, so
   * it is checked rather than assumed.
   */
  private resolve(key: string): string {
    const target = path.resolve(this.root, key);
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : this.root + path.sep;

    if (target !== this.root && !target.startsWith(rootWithSep)) {
      throw ApiError.badRequest('Invalid storage key.');
    }

    return target;
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<StoredFile> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);

    return { key, url: this.url(key), sizeBytes: data.length };
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch (error) {
      // Already gone is the desired end state, not a failure.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  url(key: string): string {
    // Keys always use forward slashes; on Windows they may arrive with
    // backslashes from path joins, which are not valid in a URL.
    return `${env.PUBLIC_BASE_URL}/uploads/${key.split(path.sep).join('/')}`;
  }
}
