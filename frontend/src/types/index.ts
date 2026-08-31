/**
 * The shapes the public website renders.
 *
 * These mirror what the API returns, so a component never translates between
 * a database record and what it displays. Ids are strings because the backend
 * uses UUIDs.
 */

export interface Course {
  id: string;
  title: string;
  slug?: string;
  description: string;
  imageUrl: string;
  level?: string;
  duration?: string;
  iconName: 'Flame' | 'Hammer' | 'Box' | string;
  accentColor: 'orange' | 'gold' | 'navy' | 'charcoal' | string;
}

export interface Testimonial {
  id: string;
  name: string;
  course: string;
  text: string;
  rating: number;
  avatarUrl?: string;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  /** Smaller copy for the grid; the lightbox uses `imageUrl`. */
  thumbnailUrl?: string;
  caption?: string;
  category?: string;
  altText?: string;
}

export interface WorkingHoursEntry {
  id: string;
  day: string;
  openTime: string;
  closeTime: string | null;
  isOpen: boolean;
}

export interface SiteSettings {
  schoolName: string;
  tagline?: string | null;
  vision: string;
  mission: string;
  aboutTitle?: string | null;
  aboutText: string;
  aboutText2?: string | null;
  graduatesCount: string;
  programsCount: number;
  phone: string;
  whatsapp?: string | null;
  email: string;
  address: string;
  mapEmbedUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  workingHoursNote?: string | null;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  iconName: 'Award' | 'Hand' | 'Users' | 'Wrench' | 'Briefcase' | string;
  accentColor: 'gold' | 'orange' | 'navy' | 'charcoal' | string;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  headline?: string;
  subtext?: string;
}

/** What the public announcements strip shows. */
export interface Announcement {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  type: 'NEWS' | 'EVENT' | 'NOTICE';
  pinned: boolean;
  publishedAt: string | null;
  attachments: { id: string; filename: string; sizeBytes: number }[];
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** Honeypot. Rendered off-screen; a real visitor never fills it in. */
  website?: string;
}

export interface ContactResponse {
  success: boolean;
  message?: string;
}
