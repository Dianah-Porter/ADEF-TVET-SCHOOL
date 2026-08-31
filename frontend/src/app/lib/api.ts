/**
 * Typed client for the ADEF API.
 *
 * The access token is held in memory only — never localStorage — so a
 * cross-site scripting bug cannot read it back out. The refresh token lives in
 * an httpOnly cookie the browser sends automatically, which is what makes a
 * page reload able to restore the session without ever exposing a credential
 * to page scripts.
 */

import { API_BASE } from '../../lib/apiBase';

export { API_BASE };

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

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal,
      body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    // fetch only rejects when the response never arrived: the API is
    // unreachable, DNS failed, or the browser blocked it because the response
    // carried no CORS headers for this origin. The browser deliberately hides
    // which, so the message names all three rather than guessing.
    //
    // A crashed API is a common cause: if it dies before its CORS middleware
    // runs, the error page comes back without the headers, and the browser
    // reports that as a network failure rather than the 500 it really is.
    if ((cause as Error)?.name === 'AbortError') throw cause;

    throw new ApiError(
      0,
      'NETWORK',
      `Could not reach the API at ${API_BASE}. It may be down, still starting, ` +
        'or refusing requests from this site.',
    );
  }

  if (response.status === 204) return undefined as T;

  let payload: {
    data?: T;
    meta?: unknown;
    error?: { code: string; message: string; fields?: Record<string, string> };
  };

  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    // Not JSON. Almost always the hosting platform's own error page, which
    // means the request never reached the application — so the status is the
    // useful part and is put in the message where it will be seen.
    throw new ApiError(
      response.status,
      'BAD_RESPONSE',
      response.ok
        ? 'The server sent a response this app could not read.'
        : `The server returned an error (HTTP ${response.status}) before the API could handle the request.`,
    );
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

export type AccentColor = 'ORANGE' | 'GOLD' | 'NAVY' | 'CHARCOAL';
export type CourseIcon = 'FLAME' | 'HAMMER' | 'BOX';
export type FeatureIcon = 'AWARD' | 'HAND' | 'USERS' | 'WRENCH' | 'BRIEFCASE';

/**
 * The admin view of a content record.
 *
 * Deliberately the raw row, not the public projection: the dashboard edits
 * `icon: 'FLAME'`, while the website receives `iconName: 'Flame'`. Editing the
 * stored value rather than the rendered one keeps the form honest about what
 * it is actually changing.
 */
export interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: string | null;
  duration: string | null;
  icon: CourseIcon;
  accentColor: AccentColor;
  imageUrl: string | null;
  sortOrder: number;
  published: boolean;
  updatedAt: string;
}

export interface AdminTestimonial {
  id: string;
  name: string;
  course: string;
  text: string;
  rating: number;
  avatarUrl: string | null;
  sortOrder: number;
  published: boolean;
  updatedAt: string;
}

export interface AdminHeroSlide {
  id: string;
  headline: string | null;
  subtext: string | null;
  imageUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  sortOrder: number;
  published: boolean;
  updatedAt: string;
}

export interface AdminFeature {
  id: string;
  title: string;
  description: string;
  icon: FeatureIcon;
  accentColor: AccentColor;
  sortOrder: number;
  published: boolean;
  updatedAt: string;
}

export interface AdminWorkingHours {
  id: string;
  day: string;
  openTime: string;
  closeTime: string | null;
  isOpen: boolean;
  sortOrder: number;
}

export interface AdminSiteSettings {
  schoolName: string;
  tagline: string | null;
  vision: string;
  mission: string;
  aboutTitle: string | null;
  aboutText: string;
  aboutText2: string | null;
  graduatesCount: string;
  programsCount: number;
  phone: string;
  whatsapp: string | null;
  email: string;
  address: string;
  mapEmbedUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  workingHoursNote: string | null;
  updatedAt: string;
}

export type ContactStatus = 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactStatus;
  createdAt: string;
  readAt: string | null;
}

export interface InboxCounts {
  NEW: number;
  READ: number;
  REPLIED: number;
  ARCHIVED: number;
  total: number;
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

/**
 * Builds the client for one content type.
 *
 * The six content endpoints are identical apart from their path and row type,
 * so they are generated rather than written out six times — which also means a
 * change to how, say, reordering is called happens in exactly one place.
 *
 * `toFormData` is supplied for the types that carry an image: those endpoints
 * take multipart bodies, and a plain JSON body would silently drop the file.
 */
function contentResource<T, TCreate extends object, TUpdate extends object>(
  path: string,
  options: { multipart?: boolean } = {},
) {
  const encode = (input: TCreate | TUpdate, image?: File | null): unknown => {
    if (!options.multipart) return input;

    const form = new FormData();

    for (const [key, value] of Object.entries(input)) {
      // Skipping null/undefined matters: FormData stringifies them, so a
      // missing optional field would arrive as the literal text "null".
      if (value === undefined || value === null) continue;
      form.append(key, String(value));
    }

    if (image) form.append('image', image);

    return form;
  };

  return {
    list: (params = '') => request<T[]>(`${path}${params}`),
    create: (input: TCreate, image?: File | null) =>
      request<T>(path, { method: 'POST', body: encode(input, image) }),
    update: (id: string, input: TUpdate, image?: File | null) =>
      request<T>(`${path}/${id}`, { method: 'PATCH', body: encode(input, image) }),
    remove: (id: string) => request<void>(`${path}/${id}`, { method: 'DELETE' }),
    reorder: (ids: string[]) =>
      request<{ reordered: number }>(`${path}/reorder`, { method: 'PATCH', body: { ids } }),
  };
}


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

    updateProfile: (patch: { name?: string; email?: string }) =>
      request<{ user: AdminUser }>('/auth/me', { method: 'PATCH', body: patch }),

    changePassword: (input: {
      currentPassword: string;
      password: string;
      confirmPassword: string;
    }) => request<{ changed: boolean }>('/auth/change-password', { method: 'POST', body: input }),

    // The reset endpoints are the only ones called while signed out, so they
    // must never trigger a refresh-and-retry on 401.
    forgotPassword: (email: string) =>
      request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
        retryOnExpiry: false,
      }),

    checkResetToken: (token: string) =>
      request<{ email: string; name: string }>(
        `/auth/reset-password?token=${encodeURIComponent(token)}`,
        { retryOnExpiry: false },
      ),

    resetPassword: (input: { token: string; password: string; confirmPassword: string }) =>
      request<{ reset: boolean }>('/auth/reset-password', {
        method: 'POST',
        body: input,
        retryOnExpiry: false,
      }),
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

  // ─── Website content ──────────────────────────────────────────────────────

  courses: contentResource<
    AdminCourse,
    {
      title: string;
      description: string;
      level?: string;
      duration?: string;
      icon: CourseIcon;
      accentColor: AccentColor;
      published: boolean;
    },
    Partial<{
      title: string;
      description: string;
      level: string;
      duration: string;
      icon: CourseIcon;
      accentColor: AccentColor;
      published: boolean;
    }>
  >('/admin/courses', { multipart: true }),

  testimonials: contentResource<
    AdminTestimonial,
    { name: string; course: string; text: string; rating: number; published: boolean },
    Partial<{ name: string; course: string; text: string; rating: number; published: boolean }>
  >('/admin/testimonials', { multipart: true }),

  hero: contentResource<
    AdminHeroSlide,
    { headline?: string; subtext?: string; published: boolean },
    Partial<{ headline: string; subtext: string; published: boolean }>
  >('/admin/hero-slides', { multipart: true }),

  features: contentResource<
    AdminFeature,
    {
      title: string;
      description: string;
      icon: FeatureIcon;
      accentColor: AccentColor;
      published: boolean;
    },
    Partial<{
      title: string;
      description: string;
      icon: FeatureIcon;
      accentColor: AccentColor;
      published: boolean;
    }>
  >('/admin/features'),

  workingHours: contentResource<
    AdminWorkingHours,
    { day: string; openTime: string; closeTime?: string | null; isOpen: boolean },
    Partial<{ day: string; openTime: string; closeTime: string | null; isOpen: boolean }>
  >('/admin/working-hours'),

  settings: {
    get: () => request<AdminSiteSettings>('/admin/settings'),
    update: (patch: Partial<AdminSiteSettings>) =>
      request<AdminSiteSettings>('/admin/settings', { method: 'PATCH', body: patch }),
  },

  // ─── Contact inbox ────────────────────────────────────────────────────────

  contact: {
    list: (params = '') =>
      requestWithMeta<ContactMessage[]>(`/admin/contact${params}`) as Promise<{
        data: ContactMessage[];
        meta: PageMeta & { counts: InboxCounts };
      }>,
    setStatus: (id: string, status: ContactStatus) =>
      request<ContactMessage>(`/admin/contact/${id}`, { method: 'PATCH', body: { status } }),
    remove: (id: string) => request<void>(`/admin/contact/${id}`, { method: 'DELETE' }),
  },
};
