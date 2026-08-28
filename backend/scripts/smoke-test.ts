/**
 * End-to-end smoke test for the ADEF API.
 *
 * Runs against a live server and exercises the paths that are expensive to get
 * wrong: authentication, upload validation, HTML sanitising and draft
 * visibility. Everything it creates, it deletes again — running it against a
 * development database leaves that database as it found it.
 *
 *   npm run dev          # in one terminal
 *   npm run test:smoke   # in another
 *
 * Exits non-zero if any check fails, so CI can use it directly.
 */
import sharp from 'sharp';
import { env } from '../src/config/env';

const BASE = `${env.PUBLIC_BASE_URL}/api/v1`;
const EMAIL = env.SEED_ADMIN_EMAIL ?? 'admin@adef.rw';
const PASSWORD = env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  [32m✓[0m ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  [31m✗[0m ${name}${detail ? `\n      ${detail}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n[1m${title}[0m`);
}

let accessToken = '';
let refreshCookie = '';

interface Result<T = any> {
  status: number;
  body: T;
  cookie?: string;
  headers: Headers;
}

async function call<T = any>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; cookie?: boolean } = {},
): Promise<Result<T>> {
  const { method = 'GET', body, auth = false, cookie = false } = options;
  const headers: Record<string, string> = {};

  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (cookie && refreshCookie) headers.Cookie = refreshCookie;

  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookie = response.headers.get('set-cookie') ?? undefined;
  const text = await response.text();

  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* a download or an empty 204 */
  }

  return { status: response.status, body: parsed as T, cookie: setCookie, headers: response.headers };
}

async function main() {
  console.log(`\nADEF API smoke test\n${BASE}`);

  // ── Health ───────────────────────────────────────────────────────────────
  section('Health');

  const health = await call('/health');
  check('health responds 200', health.status === 200, `got ${health.status}`);
  check('database is reachable', health.body?.data?.database?.ok === true);

  if (health.status !== 200) {
    console.log('\n[31mThe API is not running. Start it with `npm run dev`.[0m\n');
    process.exit(1);
  }

  // ── Authentication ───────────────────────────────────────────────────────
  section('Authentication');

  const badPassword = await call('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: 'definitely-wrong' },
  });
  const unknownEmail = await call('/auth/login', {
    method: 'POST',
    body: { email: 'nobody@example.com', password: 'definitely-wrong' },
  });

  check('wrong password is rejected', badPassword.status === 401);
  check('unknown email is rejected', unknownEmail.status === 401);
  check(
    'both failures give an identical message (no account enumeration)',
    badPassword.body?.error?.message === unknownEmail.body?.error?.message,
    `"${badPassword.body?.error?.message}" vs "${unknownEmail.body?.error?.message}"`,
  );

  const invalid = await call('/auth/login', {
    method: 'POST',
    body: { email: 'not-an-email', password: '' },
  });
  check('malformed input returns field-level errors', Boolean(invalid.body?.error?.fields?.email));

  const login = await call('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
  check('correct credentials sign in', login.status === 200, `got ${login.status}`);

  if (login.status !== 200) {
    console.log('\n[31mCannot continue without a session. Has the database been seeded?[0m\n');
    process.exit(1);
  }

  accessToken = login.body.data.accessToken;
  refreshCookie = (login.cookie ?? '').split(';')[0] ?? '';

  check('refresh cookie is httpOnly', (login.cookie ?? '').toLowerCase().includes('httponly'));
  check(
    'refresh cookie is scoped to the auth routes',
    (login.cookie ?? '').includes('Path=/api/v1/auth'),
  );

  const me = await call('/auth/me', { auth: true });
  check('/auth/me returns the signed-in user', me.body?.data?.user?.email === EMAIL);

  const noToken = await call('/auth/me');
  check('/auth/me without a token is 401', noToken.status === 401);

  const tampered = await call('/auth/me');
  accessToken = `${accessToken.slice(0, -1)}X`;
  const forged = await call('/auth/me', { auth: true });
  check('a tampered token is rejected', forged.status === 401);
  accessToken = login.body.data.accessToken;
  void tampered;

  const algNone = await fetch(`${BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'x', role: 'SUPER_ADMIN', iss: 'adef-api' })).toString('base64url')}.`,
    },
  });
  check('an alg=none token is rejected', algNone.status === 401);

  // ── Authorisation ────────────────────────────────────────────────────────
  section('Authorisation');

  const adminNoAuth = await call('/admin/gallery');
  check('admin routes reject anonymous callers', adminNoAuth.status === 401);

  const publicGallery = await call('/gallery?limit=1');
  check('public gallery needs no token', publicGallery.status === 200);

  // ── Uploads ──────────────────────────────────────────────────────────────
  section('Uploads');

  const photo = await sharp({
    create: { width: 2600, height: 1700, channels: 3, background: { r: 40, g: 80, b: 140 } },
  })
    .withExifMerge({ GPS: { GPSLatitudeRef: 'S', GPSLongitudeRef: 'E' } })
    .jpeg({ quality: 90 })
    .toBuffer();

  const goodUpload = new FormData();
  goodUpload.append('images', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'smoke-test.jpg');
  goodUpload.append('category', 'SmokeTest');
  goodUpload.append('altText', 'Smoke test image');

  const uploaded = await call('/admin/gallery', { method: 'POST', body: goodUpload, auth: true });
  check('a real JPEG uploads', uploaded.status === 201, JSON.stringify(uploaded.body?.error));

  const image = uploaded.body?.data?.created?.[0];
  check('it is re-encoded to WebP', image?.mimeType === 'image/webp');
  check('it is capped at 2000px on the longest edge', (image?.width ?? 9999) <= 2000);

  if (image) {
    const stored = await fetch(image.url);
    const buffer = Buffer.from(await stored.arrayBuffer());
    const meta = await sharp(buffer).metadata();
    check('EXIF (including GPS) is stripped from the stored file', !meta.exif);
    check('a thumbnail is generated', Boolean(image.thumbnailUrl));
  }

  const fakeImage = new FormData();
  fakeImage.append(
    'images',
    new Blob([new Uint8Array(Buffer.from('MZ\x90\x00 not an image at all'))], { type: 'image/jpeg' }),
    'malware.jpg',
  );
  fakeImage.append('category', 'SmokeTest');

  const rejected = await call('/admin/gallery', { method: 'POST', body: fakeImage, auth: true });
  check('an executable renamed .jpg is rejected', rejected.status === 400);

  // ── Announcements ────────────────────────────────────────────────────────
  section('Announcements');

  const created = await call('/admin/announcements', {
    method: 'POST',
    auth: true,
    body: {
      title: 'Smoke Test Announcement',
      body: '<p>Safe <strong>text</strong>.</p><script>alert(1)</script><p onclick="x()">Bad <a href="javascript:alert(1)">link</a> and <a href="https://adef.rw">good link</a>.</p>',
      type: 'NOTICE',
    },
  });

  check('an announcement is created', created.status === 201, JSON.stringify(created.body?.error));

  const announcement = created.body?.data;
  const storedBody: string = announcement?.body ?? '';

  check('<script> is stripped', !storedBody.includes('<script'));
  check('inline event handlers are stripped', !storedBody.includes('onclick'));
  check('javascript: URLs are stripped', !storedBody.includes('javascript:'));
  check('legitimate formatting survives', storedBody.includes('<strong>'));
  check('links get rel="noopener noreferrer"', storedBody.includes('noopener'));
  check('it starts as a draft', announcement?.status === 'DRAFT');

  const draftPublic = await call(`/announcements/${announcement?.slug}`);
  check('a draft is 404 publicly (not 403)', draftPublic.status === 404);

  await call(`/admin/announcements/${announcement?.id}`, {
    method: 'PATCH',
    auth: true,
    body: { status: 'PUBLISHED' },
  });

  const nowPublic = await call(`/announcements/${announcement?.slug}`);
  check('publishing makes it visible', nowPublic.status === 200);

  const renamed = await call(`/admin/announcements/${announcement?.id}`, {
    method: 'PATCH',
    auth: true,
    body: { title: 'Smoke Test Announcement Renamed' },
  });
  check(
    'the slug survives a title change (shared links keep working)',
    renamed.body?.data?.slug === announcement?.slug,
  );

  // ── PDF attachments ──────────────────────────────────────────────────────
  section('Attachments');

  const pdf = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  );

  const docs = new FormData();
  docs.append('documents', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), 'Smoke Test.pdf');
  docs.append(
    'documents',
    new Blob([new Uint8Array(Buffer.from('not a pdf'))], { type: 'application/pdf' }),
    'fake.pdf',
  );

  const attached = await call(`/admin/announcements/${announcement?.id}/attachments`, {
    method: 'POST',
    body: docs,
    auth: true,
  });

  check('a real PDF attaches', attached.body?.data?.created?.length === 1);
  check('a fake PDF is rejected', attached.body?.data?.failed?.length === 1);

  const attachmentId = attached.body?.data?.created?.[0]?.id;

  if (attachmentId) {
    const download = await fetch(`${BASE}/announcements/attachments/${attachmentId}/download`);
    const disposition = download.headers.get('content-disposition') ?? '';
    check('the download keeps the original filename', disposition.includes('Smoke Test.pdf'), disposition);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────
  section('Cleanup');

  const deleteAnnouncement = await call(`/admin/announcements/${announcement?.id}`, {
    method: 'DELETE',
    auth: true,
  });
  check('the test announcement is deleted', deleteAnnouncement.status === 204);

  if (image) {
    const deleteImage = await call(`/admin/gallery/${image.id}`, { method: 'DELETE', auth: true });
    check('the test photo is deleted', deleteImage.status === 204);

    const goneFromDisk = await fetch(image.url);
    check('its file is removed from storage', goneFromDisk.status === 404);
  }

  const loggedOut = await call('/auth/logout', { method: 'POST', auth: true, cookie: true });
  check('sign-out succeeds', loggedOut.status === 200);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(
    `\n${failed === 0 ? '[32m' : '[31m'}${passed} passed, ${failed} failed[0m`,
  );

  if (failed > 0) {
    console.log(`\nFailed:\n${failures.map((name) => `  - ${name}`).join('\n')}\n`);
    process.exit(1);
  }

  console.log('');
}

main().catch((error) => {
  console.error('\nThe smoke test could not finish:', error);
  process.exit(1);
});
