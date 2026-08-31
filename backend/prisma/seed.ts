/**
 * Seeds the database so a fresh clone is immediately usable:
 *
 *   1. the first administrator, from SEED_ADMIN_* in .env
 *   2. the 21 gallery photos the public site currently ships as static imports
 *   3. one draft example announcement, so the dashboard has something to show
 *   4. the website content itself — settings, hero slides, courses,
 *      testimonials, why-choose points and opening hours
 *
 * Step 4 reproduces exactly what the frontend used to hard-code, so a fresh
 * database renders the real ADEF site rather than a page of placeholders.
 *
 * Safe to run repeatedly — every write is an upsert keyed on something stable.
 *
 * Images go through the storage driver rather than straight to disk, so running
 * this against a deployment with STORAGE_DRIVER=vercel-blob uploads them to the
 * Blob store and records the Blob URLs. Writing to disk here would have stored
 * localhost URLs in the production database and left the files on whichever
 * machine ran the seed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import * as argon2 from '@node-rs/argon2';

import { prisma } from '../src/lib/prisma';
import { env } from '../src/config/env';
import { getSettings } from '../src/modules/content/content.service';
import { storage } from '../src/storage';

/**
 * The exact render order of `galleryImages` in
 * src/app/components/GallerySection.tsx. Preserving it means that when the
 * frontend switches from static imports to the API in Phase 7, the page looks
 * identical — so any visual change is a real regression, not seed noise.
 */
const GALLERY_FILES = [
  'image-12.png',
  'image-19.png',
  'image-11.png',
  'image-20.png',
  'image-16.png',
  'image-21.png',
  'image-17.png',
  'image-22.png',
  'image-9.png',
  'image-23.png',
  'image-14.png',
  'image-24.png',
  'image-5.png',
  'image-6.png',
  'image-7.png',
  'image-8.png',
  'image-2.png',
  'image.png',
  'image-1.png',
  'image-3.png',
  'image-4.png',
];

/**
 * The seed reads its images straight out of the frontend's bundled assets, so
 * the two live in one repository and this path crosses between them. It breaks
 * if the frontend is ever deployed from a separate checkout — at which point
 * the images should be uploaded through the dashboard instead.
 */
const FRONTEND_IMPORTS = path.resolve(__dirname, '../../frontend/src/imports');

async function seedAdmin() {
  const email = env.SEED_ADMIN_EMAIL;
  const password = env.SEED_ADMIN_PASSWORD;
  const name = env.SEED_ADMIN_NAME ?? 'ADEF Administrator';

  if (!email || !password) {
    console.log('  skipped — SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are not set in .env');
    return null;
  }

  const passwordHash = await argon2.hash(password);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    // Re-running the seed must not silently reset a password that has since
    // been changed, so update only touches the profile fields.
    update: { name, role: 'SUPER_ADMIN', isActive: true },
    create: { email, name, passwordHash, role: 'SUPER_ADMIN' },
  });

  console.log(`  ${admin.email}  (SUPER_ADMIN)`);
  return admin;
}

async function seedGallery(uploadedById: string | null) {
  let created = 0;
  let updated = 0;

  for (const [index, filename] of GALLERY_FILES.entries()) {
    const source = path.join(FRONTEND_IMPORTS, filename);

    let original: Buffer;
    try {
      original = await fs.readFile(source);
    } catch {
      console.log(`  ! missing ${filename} — skipped`);
      continue;
    }

    const thumbName = filename.replace(/\.png$/i, '.webp');
    const storageKey = `gallery/seed/${filename}`;
    const thumbnailKey = `gallery/seed/thumbs/${thumbName}`;

    // The original bytes are stored unchanged, so the seeded gallery is
    // pixel-for-pixel what the site shipped before it was database-backed.
    const stored = await storage.put(storageKey, original, 'image/png');

    const thumbnail = await sharp(original)
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const storedThumb = await storage.put(thumbnailKey, thumbnail, 'image/webp');

    const metadata = await sharp(original).metadata();

    const data = {
      title: `Campus photo ${String(index + 1).padStart(2, '0')}`,
      // Deliberately generic: real descriptions need someone who knows what
      // each photo shows. The dashboard exists so staff can write them.
      altText: 'Students and facilities at ADEF TVET School',
      category: 'Campus',
      url: stored.url,
      thumbnailKey,
      thumbnailUrl: storedThumb.url,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      sizeBytes: stored.sizeBytes,
      mimeType: 'image/png',
      sortOrder: index,
      published: true,
      uploadedById,
    };

    const existing = await prisma.galleryImage.findUnique({ where: { storageKey } });

    await prisma.galleryImage.upsert({
      where: { storageKey },
      // Preserve any title, caption or alt text an admin has already written.
      update: { sortOrder: index, thumbnailKey, thumbnailUrl: data.thumbnailUrl },
      create: { ...data, storageKey },
    });

    if (existing) updated++;
    else created++;
  }

  console.log(`  ${created} created, ${updated} left as-is (already present)`);
}

async function seedExampleAnnouncement(authorId: string | null) {
  const slug = 'example-announcement';

  await prisma.announcement.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      title: 'Example announcement — safe to delete',
      body:
        '<p>This draft exists so the dashboard has something to open on a fresh install. ' +
        'It is a <strong>draft</strong>, so it never appears on the public site.</p>' +
        '<p>Delete it once real announcements are being posted.</p>',
      excerpt: 'Placeholder created by the database seed.',
      type: 'NOTICE',
      // DRAFT, never PUBLISHED: placeholder text must not be able to reach
      // the public site by accident.
      status: 'DRAFT',
      authorId,
    },
  });

  console.log('  1 draft example (not public)');
}

async function main() {
  console.log('\nSeeding the ADEF database\n');

  console.log('Administrator');
  const admin = await seedAdmin();

  console.log('\nGallery');
  await seedGallery(admin?.id ?? null);

  console.log('\nAnnouncements');
  await seedExampleAnnouncement(admin?.id ?? null);

  console.log('\nSite settings');
  await seedSettings();

  console.log('\nHero slides');
  await seedHeroSlides();

  console.log('\nCourses');
  await seedCourses();

  console.log('\nTestimonials');
  await seedTestimonials();

  console.log('\nWhy-choose points');
  await seedFeatures();

  console.log('\nWorking hours');
  await seedWorkingHours();

  console.log('\nDone.\n');
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ─── Website content ────────────────────────────────────────────────────────

/**
 * Copies one of the frontend's bundled images into the upload root and returns
 * what the database needs to reference it.
 *
 * Seed images live under a `seed/` prefix so they are obvious in the uploads
 * directory and can never collide with a real upload, whose key is a UUID.
 */
async function copySeedImage(folder: string, filename: string) {
  const source = path.join(FRONTEND_IMPORTS, filename);

  let input: Buffer;
  try {
    input = await fs.readFile(source);
  } catch {
    return null;
  }

  const webpName = filename.replace(/\.[^.]+$/, '.webp');
  const storageKey = `${folder}/seed/${webpName}`;

  // Converted rather than copied: these are the same images the dashboard
  // would produce for an upload, so the site is not serving a PNG where
  // everything else is WebP.
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const stored = await storage.put(storageKey, data, 'image/webp');

  return {
    storageKey,
    url: stored.url,
    width: info.width,
    height: info.height,
    sizeBytes: stored.sizeBytes,
    mimeType: 'image/webp',
  };
}

async function seedSettings() {
  // The service owns the default values, so seeding is just "make the row
  // exist" — one definition of the defaults rather than two that can drift.
  const settings = await getSettings();
  console.log(`  ${settings.schoolName}`);
}

const HERO_FILES = ['image-2.png', 'image.png', 'image-1.png', 'image-3.png', 'image-4.png'];

async function seedHeroSlides() {
  let created = 0;

  for (const [index, filename] of HERO_FILES.entries()) {
    const image = await copySeedImage('hero', filename);

    if (!image) {
      console.log(`  ! missing ${filename} — skipped`);
      continue;
    }

    const existing = await prisma.heroSlide.findUnique({
      where: { storageKey: image.storageKey },
    });

    if (existing) continue;

    const { url, ...rest } = image;

    await prisma.heroSlide.create({
      data: { ...rest, imageUrl: url, sortOrder: index, published: true },
    });
    created++;
  }

  console.log(`  ${created} created`);
}

const COURSES = [
  {
    slug: 'welding-l3',
    title: 'Welding L3',
    description: 'Master modern welding techniques with practical industrial training.',
    icon: 'FLAME',
    accentColor: 'ORANGE',
    file: 'image-18.png',
  },
  {
    slug: 'masonry-l3',
    title: 'Masonry L3',
    description: 'Develop strong construction and structural building skills.',
    icon: 'HAMMER',
    accentColor: 'GOLD',
    file: 'image-10.png',
  },
  {
    slug: 'carpentry-l3',
    title: 'Carpentry L3',
    description: 'Learn professional woodworking and craftsmanship techniques.',
    icon: 'BOX',
    accentColor: 'CHARCOAL',
    file: 'image-15.png',
  },
] as const;

async function seedCourses() {
  let created = 0;

  for (const [index, course] of COURSES.entries()) {
    const existing = await prisma.course.findUnique({ where: { slug: course.slug } });
    if (existing) continue;

    const image = await copySeedImage('courses', course.file);

    await prisma.course.create({
      data: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        icon: course.icon,
        accentColor: course.accentColor,
        imageKey: image?.storageKey ?? null,
        imageUrl: image?.url ?? null,
        sortOrder: index,
        published: true,
      },
    });

    created++;
  }

  console.log(`  ${created} created`);
}

const TESTIMONIALS = [
  {
    name: 'Jean Pierre Mukiza',
    course: 'Welding L3 Graduate',
    text: 'ADEF gave me practical skills that prepared me for real employment opportunities. The hands-on training was exactly what I needed.',
  },
  {
    name: 'Marie Claire Uwase',
    course: 'Masonry L3 Graduate',
    text: 'The hands-on approach makes learning engaging and effective. I gained confidence in my abilities and found a great job right after graduation.',
  },
  {
    name: 'Eric Niyonzima',
    course: 'Carpentry L3 Graduate',
    text: 'Professional instructors and modern equipment made all the difference. ADEF TVET truly prepares you for the workforce.',
  },
  {
    name: 'Grace Mutoni',
    course: 'Welding L3 Graduate',
    text: 'I highly recommend ADEF to anyone looking for quality vocational training. The certification opened many doors for me.',
  },
];

async function seedTestimonials() {
  // There is no natural unique key here, so "has anything been seeded yet" is
  // the guard: re-running must not duplicate the list, and must not overwrite
  // a quote an admin has since edited.
  if ((await prisma.testimonial.count()) > 0) {
    console.log('  already present — left as-is');
    return;
  }

  await prisma.testimonial.createMany({
    data: TESTIMONIALS.map((item, index) => ({
      ...item,
      rating: 5,
      sortOrder: index,
      published: true,
    })),
  });

  console.log(`  ${TESTIMONIALS.length} created`);
}

const FEATURES = [
  {
    title: 'Certified & Accredited Programs',
    description: 'Nationally recognized qualifications that meet industry standards',
    icon: 'AWARD',
    accentColor: 'GOLD',
  },
  {
    title: 'Hands-On Practical Learning',
    description: 'Real-world experience through intensive practical training sessions',
    icon: 'HAND',
    accentColor: 'ORANGE',
  },
  {
    title: 'Skilled Professional Instructors',
    description: 'Learn from experienced industry professionals and certified trainers',
    icon: 'USERS',
    accentColor: 'NAVY',
  },
  {
    title: 'Industry Standard Equipment',
    description: 'Train with the same tools and technology used in the field',
    icon: 'WRENCH',
    accentColor: 'CHARCOAL',
  },
  {
    title: 'Career-Focused Training',
    description: 'Curriculum designed to meet local and international job market demands',
    icon: 'BRIEFCASE',
    accentColor: 'GOLD',
  },
] as const;

async function seedFeatures() {
  if ((await prisma.feature.count()) > 0) {
    console.log('  already present — left as-is');
    return;
  }

  await prisma.feature.createMany({
    data: FEATURES.map((item, index) => ({ ...item, sortOrder: index, published: true })),
  });

  console.log(`  ${FEATURES.length} created`);
}

const WORKING_HOURS = [
  { day: 'Monday – Saturday', openTime: '7:30 AM', closeTime: '5:00 PM', isOpen: true },
  { day: 'Sunday', openTime: '', closeTime: null, isOpen: false },
];

async function seedWorkingHours() {
  if ((await prisma.workingHours.count()) > 0) {
    console.log('  already present — left as-is');
    return;
  }

  await prisma.workingHours.createMany({
    data: WORKING_HOURS.map((item, index) => ({ ...item, sortOrder: index })),
  });

  console.log(`  ${WORKING_HOURS.length} created`);
}
