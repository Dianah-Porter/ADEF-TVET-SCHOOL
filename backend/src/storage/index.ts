import crypto from 'node:crypto';
import { env } from '../config/env';
import { LocalDriver } from './LocalDriver';
import type { StorageDriver } from './StorageDriver';

export type { StorageDriver, StoredFile } from './StorageDriver';

function createDriver(): StorageDriver {
  switch (env.STORAGE_DRIVER) {
    case 'local':
      return new LocalDriver();
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
}

export const storage: StorageDriver = createDriver();

/**
 * Builds a storage key of the form `gallery/2026/08/<uuid>.webp`.
 *
 * The filename is a UUID, never anything the uploader supplied — an original
 * name can contain path separators, null bytes or a second extension, and none
 * of that can matter if it is discarded. The real name is kept in the database
 * as metadata, which is where it is safe.
 *
 * The year/month segments keep any single directory small enough to stay fast
 * as the archive grows over the years.
 */
export function buildStorageKey(folder: 'gallery' | 'docs', extension: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ext = extension.startsWith('.') ? extension : `.${extension}`;

  return `${folder}/${year}/${month}/${crypto.randomUUID()}${ext}`;
}

/** The thumbnail that belongs to an original: same path, `thumbs/` inserted. */
export function thumbnailKeyFor(originalKey: string): string {
  const parts = originalKey.split('/');
  const filename = parts.pop() ?? '';
  const base = filename.replace(/\.[^.]+$/, '');

  return [...parts, 'thumbs', `${base}.webp`].join('/');
}
