/**
 * Typed client for the ADEF API.
 *
 * The access token is held in memory only — never localStorage — so a
 * cross-site scripting bug cannot read it back out. The refresh token lives in
 * an httpOnly cookie the browser sends automatically, which is what makes a
 * page reload able to restore the session without ever exposing a credential
 * to page scripts.
 */

const API_BASE: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ??
  'http://localhost:4000/api/v1';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /** Per-input messages, ready to render beside the field that caused them. */
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Set false for the refresh call itself, to avoid recursing. */
  retryOnExpiry?: boolean;
  signal?: AbortSignal;
}

/**
 * Refreshing is single-flight.
 *
 * A dashboard screen often fires several requests at once. If the token has
 * expired they would all get a 401 and all try to refresh, and because refresh
 * tokens rotate, the second one to arrive would present an already-used token —
 * which the API correctly treats as theft and responds to by revoking every
 * session. Sharing one in-flight promise is what stops the dashboard logging
 * itself out.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) return false;

      const payload = (await response.json()) as { data: { accessToken: string } };
      accessToken = payload.data.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      // Cleared on the next tick so concurrent callers all see this result.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, retryOnExpiry = true, signal } = options;

  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  // FormData must set its own Content-Type so the multipart boundary is right.
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    signal,
    body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  let payload: {
    data?: T;
    meta?: unknown;
    error?: { code: string; message: string; fields?: Record<string, string> };
  };

  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new ApiError(response.status, 'NETWORK', 'The server sent an unreadable response.');
  }

  if (!response.ok) {
    const error = payload.error;

    // An expired token is recoverable: refresh once, then replay the request.
    if (response.status === 401 && error?.code === 'TOKEN_EXPIRED' && retryOnExpiry) {
      if (await refreshSession()) {
        return request<T>(path, { ...options, retryOnExpiry: false });
      }
    }

    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Something went wrong.',
      error?.fields,
    );
  }

  return payload.data as T;
}

/** Same as request, but keeps the pagination meta the list endpoints return. */
async function requestWithMeta<T>(path: string): Promise<{ data: T; meta: PageMeta }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE}${path}`, { headers, credentials: 'include' });
  const payload = (await response.json()) as {
    data?: T;
    meta?: PageMeta;
    error?: { code: string; message: string; fields?: Record<string, string> };
  };

  if (!response.ok) {
    if (response.status === 401 && payload.error?.code === 'TOKEN_EXPIRED') {
      if (await refreshSession()) return requestWithMeta<T>(path);
    }
    throw new ApiError(
      response.status,
      payload.error?.code ?? 'UNKNOWN',
      payload.error?.message ?? 'Something went wrong.',
      payload.error?.fields,
    );
  }

  return {
    data: payload.data as T,
    meta: payload.meta ?? { page: 1, limit: 0, total: 0, totalPages: 1 },
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'EDITOR';
}

export interface GalleryImage {
  id: string;
  title: string;
  caption: string | null;
  altText: string;
  category: string;
  url: string;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  sizeBytes: number;
  sortOrder: number;
  published: boolean;
  uploadedBy?: { id: string; name: string } | null;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export type AnnouncementType = 'NEWS' | 'EVENT' | 'NOTICE';
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED';

export interface Announcement {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  type: AnnouncementType;
  status: AnnouncementStatus;
  pinned: boolean;
  publishedAt: string | null;
  updatedAt: string;
  author?: { id: string; name: string } | null;
  attachments: Attachment[];
}

export interface DashboardStats {
  galleryImages: number;
  publishedAnnouncements: number;
  draftAnnouncements: number;
  attachments: number;
  storageBytes: number;
  recentActivity: { id: string; action: string; entity: string; actor: string; at: string }[];
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: AdminUser; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        retryOnExpiry: false,
      }),
    logout: () => request<{ signedOut: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ user: AdminUser }>('/auth/me'),
    restore: refreshSession,
  },

  gallery: {
    listPublic: (params = '') => requestWithMeta<GalleryImage[]>(`/gallery${params}`),
    listAdmin: (params = '') => requestWithMeta<GalleryImage[]>(`/admin/gallery${params}`),
    upload: (files: File[], meta: { category: string; altText?: string }) => {
      const form = new FormData();
      files.forEach((file) => form.append('images', file));
      form.append('category', meta.category);
      if (meta.altText) form.append('altText', meta.altText);

      return request<{ created: GalleryImage[]; failed: { filename: string; reason: string }[] }>(
        '/admin/gallery',
        { method: 'POST', body: form },
      );
    },
    update: (id: string, patch: Partial<GalleryImage>) =>
      request<GalleryImage>(`/admin/gallery/${id}`, { method: 'PATCH', body: patch }),
    remove: (id: string) => request<void>(`/admin/gallery/${id}`, { method: 'DELETE' }),
    reorder: (ids: string[]) =>
      request<{ reordered: number }>('/admin/gallery/reorder', { method: 'PATCH', body: { ids } }),
  },

  announcements: {
    listPublic: (params = '') => requestWithMeta<Announcement[]>(`/announcements${params}`),
    getBySlug: (slug: string) => request<Announcement>(`/announcements/${slug}`),
    listAdmin: (params = '') => requestWithMeta<Announcement[]>(`/admin/announcements${params}`),
    get: (id: string) => request<Announcement>(`/admin/announcements/${id}`),
    create: (input: Partial<Announcement>) =>
      request<Announcement>('/admin/announcements', { method: 'POST', body: input }),
    update: (id: string, patch: Partial<Announcement>) =>
      request<Announcement>(`/admin/announcements/${id}`, { method: 'PATCH', body: patch }),
    remove: (id: string) => request<void>(`/admin/announcements/${id}`, { method: 'DELETE' }),
    attach: (id: string, files: File[]) => {
      const form = new FormData();
      files.forEach((file) => form.append('documents', file));
      return request<{ created: Attachment[]; failed: { filename: string; reason: string }[] }>(
        `/admin/announcements/${id}/attachments`,
        { method: 'POST', body: form },
      );
    },
    detach: (attachmentId: string) =>
      request<void>(`/admin/attachments/${attachmentId}`, { method: 'DELETE' }),
    downloadUrl: (attachmentId: string) =>
      `${API_BASE}/announcements/attachments/${attachmentId}/download`,
  },

  stats: () => request<DashboardStats>('/admin/stats'),
};
