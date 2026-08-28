export interface StoredFile {
  /** Path within the driver. The database stores this, never a filesystem path. */
  key: string;
  /** Absolute URL a browser can fetch. */
  url: string;
  sizeBytes: number;
}

/**
 * The whole surface the rest of the codebase knows about storage.
 *
 * Keeping it this small is the point: swapping local disk for Cloudinary or S3
 * means writing one new implementation of these four methods. Nothing outside
 * this folder ever learns where a file physically lives — which matters because
 * most free hosting wipes the disk on every redeploy.
 */
export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<StoredFile>;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  url(key: string): string;
}
