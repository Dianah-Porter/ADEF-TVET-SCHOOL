/**
 * Read-only client for the public ADEF website.
 *
 * Separate from the dashboard client in `src/app/lib/api.ts` on purpose: this
 * one never sends credentials and never holds a token, so nothing a visitor
 * loads can reach an authenticated endpoint. Both share one address, from
 * `apiBase.ts`.
 *
 * Every response is unwrapped from the API envelope `{ data, meta? }` before
 * it reaches a component, so the sections render plain arrays and objects.
 *
 * Endpoints consumed:
 *   GET  /courses
 *   GET  /testimonials
 *   GET  /gallery
 *   GET  /working-hours
 *   GET  /settings
 *   GET  /features
 *   GET  /hero-slides
 *   GET  /announcements
 *   POST /contact
 */

import { API_BASE } from './apiBase';
import type {
  Announcement,
  ContactFormData,
  ContactResponse,
  Course,
  Feature,
  GalleryItem,
  HeroSlide,
  SiteSettings,
  Testimonial,
  WorkingHoursEntry,
} from '../types';

export { API_BASE };

/**
 * The site always calls the API. There is no "disabled" mode any more — the
 * content lives in the database now — but `useApi` still falls back to the
 * bundled static copy if a request fails, so a backend outage degrades the
 * site to its previous appearance rather than to a blank page.
 */
export const isApiEnabled = true;

interface Envelope<T> {
  data?: T;
  meta?: unknown;
  error?: { code: string; message: string; fields?: Record<string, string> };
}

async function unwrap<T>(response: Response, label: string): Promise<T> {
  let payload: Envelope<T>;

  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    throw new Error(`${label} returned a response that could not be read.`);
  }

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `${label} failed with status ${response.status}.`);
  }

  return payload.data as T;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });

  return unwrap<T>(response, `GET ${path}`);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  return unwrap<T>(response, `POST ${path}`);
}

/**
 * The gallery endpoint is paginated and returns the storage record; the site
 * wants a flat list of pictures. Translating here keeps GallerySection unaware
 * that pagination exists at all.
 */
interface GalleryRecord {
  id: string;
  caption: string | null;
  altText: string;
  category: string;
  url: string;
  thumbnailUrl: string | null;
}

export const api = {
  courses: {
    list: () => get<Course[]>('/courses'),
  },
  testimonials: {
    list: () => get<Testimonial[]>('/testimonials'),
  },
  gallery: {
    list: async (): Promise<GalleryItem[]> => {
      const rows = await get<GalleryRecord[]>('/gallery?limit=100');

      return rows.map((row) => ({
        id: row.id,
        // The full-size image, not the thumbnail: the lightbox opens this and
        // a 480px-wide thumbnail looks soft blown up to full screen.
        imageUrl: row.url,
        thumbnailUrl: row.thumbnailUrl ?? row.url,
        caption: row.caption ?? undefined,
        category: row.category,
        altText: row.altText,
      }));
    },
  },
  workingHours: {
    list: () => get<WorkingHoursEntry[]>('/working-hours'),
  },
  settings: {
    get: () => get<SiteSettings>('/settings'),
  },
  features: {
    list: () => get<Feature[]>('/features'),
  },
  hero: {
    list: () => get<HeroSlide[]>('/hero-slides'),
  },
  announcements: {
    list: () => get<Announcement[]>('/announcements?limit=6'),
  },
  contact: {
    submit: (data: ContactFormData) => post<ContactResponse>('/contact', data),
  },
};
