/**
 * Seeds the database so a fresh clone is immediately usable:
 *
 *   1. the first administrator, from SEED_ADMIN_* in .env
 *   2. the 21 gallery photos the public site currently ships as static imports
 *   3. one draft example announcement, so the dashboard has something to show
 *
 * Safe to run repeatedly — every write is an upsert keyed on something stable.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import * as argon2 from '@node-rs/argon2';

import { prisma } from '../src/lib/prisma';
import { env } from '../src/config/env';

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

const FRONTEND_IMPORTS = path.resolve(__dirname, '../../src/imports');

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
  const galleryDir = path.join(env.uploadRoot, 'gallery', 'seed');
  const thumbDir = path.join(galleryDir, 'thumbs');
  await fs.mkdir(thumbDir, { recursive: true });

  let created = 0;
  let updated = 0;

  for (const [index, filename] of GALLERY_FILES.entries()) {
    const source = path.join(FRONTEND_IMPORTS, filename);

    try {
      await fs.access(source);
    } catch {
      console.log(`  ! missing ${filename} — skipped`);
      continue;
    }

    const destination = path.join(galleryDir, filename);
    // Copy rather than convert: an identical byte-for-byte file removes any
    // doubt about whether the gallery still looks the way it did.
    await fs.copyFile(source, destination);

    const thumbName = filename.replace(/\.png$/i, '.webp');
    await sharp(source)
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(thumbDir, thumbName));

    const metadata = await sharp(destination).metadata();
    const stats = await fs.stat(destination);

    const storageKey = `gallery/seed/${filename}`;
    const thumbnailKey = `gallery/seed/thumbs/${thumbName}`;

    const data = {
      title: `Campus photo ${String(index + 1).padStart(2, '0')}`,
      // Deliberately generic: real descriptions need someone who knows what
      // each photo shows. The dashboard exists so staff can write them.
      altText: 'Students and facilities at ADEF TVET School',
      category: 'Campus',
      url: `${env.PUBLIC_BASE_URL}/uploads/${storageKey}`,
      thumbnailKey,
      thumbnailUrl: `${env.PUBLIC_BASE_URL}/uploads/${thumbnailKey}`,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      sizeBytes: stats.size,
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
