/**
 * An error that carries the HTTP status and machine-readable code the client
 * should see. Anything thrown that is NOT an ApiError is treated as a bug and
 * reported as a generic 500, so internal details never leak to the browser.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message: string, fields?: Record<string, string>) {
    return new ApiError(400, 'BAD_REQUEST', message, fields);
  }

  static unauthorized(message = 'You need to sign in to do that.') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Your account cannot perform this action.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'That item does not exist.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }

  static payloadTooLarge(message: string) {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', message);
  }

  static unsupportedMedia(message: string) {
    return new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', message);
  }

  static tooManyRequests(message = 'Too many attempts. Try again shortly.') {
    return new ApiError(429, 'TOO_MANY_REQUESTS', message);
  }

  static internal(message = 'Something went wrong on our end.') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
