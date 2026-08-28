/**
 * Magic-byte detection for the four formats this API accepts.
 *
 * Why not the `file-type` package: it is ESM-only from v17 and this is a
 * CommonJS build, so consuming it would mean fighting the module system for
 * four signatures that are each a fixed byte sequence.
 *
 * This is not the only line of defence. Images are re-encoded by sharp, which
 * fails on anything that is not a real image and discards any payload hidden
 * in the original container.
 */

export type DetectedType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

export const IMAGE_TYPES: DetectedType[] = ['image/jpeg', 'image/png', 'image/webp'];

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

/**
 * Returns the real type of the buffer, or null if it is not one we accept.
 * The client's declared Content-Type and the filename extension are ignored
 * entirely — both are attacker-controlled.
 */
export function detectFileType(buffer: Buffer): DetectedType | null {
  // JPEG: FF D8 FF
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';

  // PNG: 89 P N G CR LF SUB LF
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';

  // WebP: "RIFF" .... "WEBP" — the size field sits between the two markers.
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }

  // PDF: "%PDF-"
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';

  return null;
}

export function isImage(type: DetectedType | null): boolean {
  return type !== null && IMAGE_TYPES.includes(type);
}

/** Human-readable list for error messages. */
export function describeAccepted(types: DetectedType[]): string {
  const names: Record<DetectedType, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'application/pdf': 'PDF',
  };
  return types.map((t) => names[t]).join(', ');
}
