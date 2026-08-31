# ADEF Backend

REST API and admin backend for the ADEF TVET School website. Serves the public
gallery and announcements, and powers the admin dashboard that publishes them.

The frontend is a sibling package in `../frontend`. Nothing here modifies it.

## Requirements

- **Node 20 or newer** — check with `node -v`
- **PostgreSQL 16 or newer**, running locally on port 5432
  ([download](https://www.postgresql.org/download/windows/)). During installation
  you set a password for the `postgres` user — you need it in step 2 below.

No Docker required.

## Running it

From a clean checkout, in order:

```bash
cd backend

# 1. Dependencies
npm install

# 2. Create the database (once). Enter the postgres password when asked.
"/c/Program Files/PostgreSQL/18/bin/psql.exe" -U postgres -h localhost -c "CREATE DATABASE adef;"

# 3. Configuration
cp .env.example .env
```

Open `.env` and set two things:

**`DATABASE_URL`** — put your `postgres` password in. If it contains any of
`@ : / ? # [ ] %`, those must be **percent-encoded**, or the URL parser reads
them as separators. `@` becomes `%40`, so `Gatesi@123` is written `Gatesi%40123`:

```
DATABASE_URL="postgresql://postgres:YOUR%40PASSWORD@localhost:5432/adef?schema=public"
```

**The two JWT secrets** — generate a fresh value for each:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then finish:

```bash
# 4. Create the tables
npm run db:migrate

# 5. Create the first administrator and import the 21 website photos
npm run db:seed

# 6. Start the API
npm run dev
```

The server prints what it bound to and whether the database answered:

```
  ADEF API  ·  development
  listening   http://localhost:4000
  health      http://localhost:4000/api/v1/health
  database    connected (337ms)
  cors        http://localhost:5173, http://127.0.0.1:5173
```

Confirm it from a browser or another terminal:

```bash
curl http://localhost:4000/api/v1/health
# {"data":{"status":"ok","database":{"ok":true,"latencyMs":3}, ... }}
```

That endpoint returns **503 rather than 200** when Postgres is unreachable, so a
hosting platform's health check correctly marks the service down instead of
sending traffic to a server that cannot answer.

The server refuses to start if either JWT secret is shorter than 32 characters,
so a placeholder left in `.env` fails loudly at boot rather than quietly
weakening authentication.

### Signing in

`npm run db:seed` creates one administrator from `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` in `.env` (defaults: `admin@adef.rw` / `ChangeMe!2026`).
The dashboard is at <http://localhost:5173/admin> once the frontend is running.

**Change that password after signing in for the first time.** Re-running the
seed deliberately does *not* reset it.

### If something will not start

| Symptom | Cause |
| --- | --- |
| `database UNREACHABLE` at startup | The Postgres service is stopped. In an **admin** PowerShell: `Start-Service postgresql-x64-18`. Add `Set-Service postgresql-x64-18 -StartupType Automatic` so it starts with Windows. |
| `password authentication failed` | Wrong password in `DATABASE_URL`, or a special character was not percent-encoded (`@` → `%40`). |
| `database "adef" does not exist` | Step 2 above was skipped. |
| `Invalid environment configuration` | A variable is missing or a secret is too short. The message names the exact field. |
| `EADDRINUSE :4000` | An earlier API is still running. Stop it, or change `PORT` in `.env`. |
| `Cannot find module ...iteinite.js` | The `&` path problem below — use `npm run <script>`, never `npx`. |
| `prisma.adminUser is undefined` | The client is stale after a schema edit. Run `npm run db:generate`. |

## Testing

There is an end-to-end smoke test that runs against a **live server**. Start the
API in one terminal, then in another:

```bash
npm run test:smoke
```

```
ADEF API smoke test
http://localhost:4000/api/v1

Health
  ✓ health responds 200
  ✓ database is reachable

Authentication
  ✓ wrong password is rejected
  ✓ both failures give an identical message (no account enumeration)
  ✓ refresh cookie is httpOnly
  ✓ an alg=none token is rejected
  ...

38 passed, 0 failed
```

It exits non-zero on any failure, so CI can call it directly.

### What it covers

| Area | Checks |
| --- | --- |
| Health | Server responds; database reachable |
| Authentication | Wrong password and unknown email are **indistinguishable**; field-level validation; httpOnly cookie scoped to `/api/v1/auth`; tampered and `alg=none` tokens rejected |
| Authorisation | Admin routes 401 anonymously; public routes need no token |
| Uploads | A real JPEG is re-encoded to WebP and capped at 2000px; **EXIF including GPS is stripped**; a thumbnail is produced; an executable renamed `.jpg` is refused |
| Announcements | `<script>`, `onclick` and `javascript:` URLs stripped while real formatting survives; links get `rel="noopener noreferrer"`; drafts 404 publicly; publishing reveals; the slug survives a title change |
| Attachments | A real PDF attaches, a fake one is refused, the download keeps its original filename |
| Cleanup | Everything created is deleted, and the file is gone from storage |

**It cleans up after itself.** Run it as many times as you like against a
development database — the gallery stays at 21 photos and no test rows are left
behind. Do not point it at production: it signs in as the seeded administrator
and creates and deletes real records.

### Testing by hand

```bash
# Sign in and keep the token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login   -H "Content-Type: application/json"   -d '{"email":"admin@adef.rw","password":"ChangeMe!2026"}'   | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Public endpoints — no token
curl http://localhost:4000/api/v1/gallery?limit=2
curl http://localhost:4000/api/v1/announcements

# Admin endpoints — token required
curl http://localhost:4000/api/v1/admin/gallery -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/v1/admin/stats   -H "Authorization: Bearer $TOKEN"

# Upload a photo
curl -X POST http://localhost:4000/api/v1/admin/gallery   -H "Authorization: Bearer $TOKEN"   -F "images=@photo.jpg" -F "category=Workshop" -F "altText=Welding bay"
```

`npm run db:studio` opens a GUI over the database if you would rather look at
rows than call endpoints.

### Static checks

```bash
npm run typecheck   # types only, no output
npm run lint        # ESLint
npm run build       # compile to dist/
```

### Resetting

`npm run db:reset` drops the database, re-applies every migration and re-seeds.
It destroys all uploaded content, so it is a development convenience only.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the API with reload on save |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run typecheck` | Types only, no output |
| `npm run lint` | ESLint |
| `npm run test:smoke` | End-to-end smoke test against a running server |
| `npm run format` | Prettier, in place |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Browse the database in a GUI |
| `npm run db:seed` | Create the first admin and backfill gallery rows |
| `npm run db:reset` | Drop, re-migrate, re-seed |

### Why the scripts call `node node_modules/...` directly

This project sits in a folder whose name contains `&`
(`Backend & Frontend ADEF`). On Windows, npm's generated `.cmd` shims expand
that path unquoted, so `cmd` splits the command at the ampersand and every
script that calls a local binary dies with
`'Frontend' is not recognized as an internal or external command`.

Invoking each binary through `node` with an explicit path skips the shims and
works on every platform. If you would rather have conventional scripts, rename
the parent folder to remove the `&` and the plain `tsx` / `tsc` / `prisma`
forms will work again.

`npx` is affected by the same problem — use `npm run <script>` instead.

## Layout

```
backend/
├─ prisma/
│  ├─ schema.prisma     models and enums
│  └─ migrations/       generated, committed
├─ prisma.config.ts     connection URL for the CLI (Prisma 7 requirement)
├─ scripts/
│  └─ smoke-test.ts    end-to-end checks against a running server
├─ src/
│  ├─ config/env.ts     zod-validated environment, parsed once at boot
│  ├─ lib/prisma.ts     database client + health probe
│  ├─ middleware/       error handling, auth, uploads
│  ├─ modules/          one folder per feature
│  ├─ routes/           mounts every module under /api/v1
│  ├─ utils/            ApiError, response envelope
│  ├─ app.ts            middleware stack
│  └─ server.ts         boot and graceful shutdown
└─ uploads/             gitignored; images and PDFs land here
```

## Conventions

**Responses.** Success is `{ data }` or `{ data, meta }` for paginated lists.
Failure is `{ error: { code, message, fields? } }`, where `fields` maps an input
name to a message the form can show inline. There is exactly one of each shape,
so the dashboard has one success path and one error path.

**Errors.** Throw `ApiError.notFound(...)` and friends from anywhere; Express 5
forwards rejected promises to the error handler on its own, so route handlers
need no `try`/`catch`. Anything that is *not* an `ApiError` is treated as a bug:
logged in full server-side, returned as a generic 500 with no internal detail.

**Database.** Prisma 7 no longer accepts `url` in `schema.prisma`. The CLI reads
it from `prisma.config.ts`; the runtime client gets it through the `pg` driver
adapter in `src/lib/prisma.ts`.

The API talks to a PostgreSQL server installed on the machine — there is no
Docker in this project. Any Postgres 16+ will do, local or hosted; only
`DATABASE_URL` decides which.

## Authentication

Sign in returns a short-lived **access token** in the JSON body and sets a
**refresh token** in an httpOnly cookie scoped to `/api/v1/auth`. Send the
access token as `Authorization: Bearer <token>`.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/v1/auth/login` | Email + password. Sets the refresh cookie. |
| `POST /api/v1/auth/refresh` | Rotates the cookie, returns a new access token. |
| `POST /api/v1/auth/logout` | Revokes the refresh token. |
| `GET /api/v1/auth/me` | The signed-in user. |

An expired access token returns code `TOKEN_EXPIRED` rather than a plain
`UNAUTHORIZED`, so the dashboard can refresh and retry silently instead of
bouncing someone to the login screen mid-edit.

**Refresh tokens rotate on every use** and only their SHA-256 hash is stored.
Revocation records *why* a token died, which is what separates two cases that
otherwise look identical:

- A token revoked by **logout** being presented again is ordinary — a tab that
  was still open retried. It gets a plain "you have been signed out" and other
  devices are untouched.
- A token revoked by **rotation** being presented again should be impossible:
  the client already replaced it. Replay means a copy exists somewhere it should
  not, so every session for that account is revoked and the event is audited.

Login failures are deliberately indistinguishable. An unknown email and a wrong
password return the same message, and the unknown-email path runs a throwaway
argon2 verification so it takes the same time — otherwise response timing would
reveal which staff addresses are registered.

Rate limiting is **disabled in development** (`skip: () => env.isDevelopment`)
so that testing the login flow is not self-defeating. In production it is 5
failed sign-ins per IP per 15 minutes; successful ones are not counted.

## Uploads

|  | Images | PDFs |
| --- | --- | --- |
| Accepted | JPEG, PNG, WebP | PDF |
| Size cap | 8 MB each, 10 per request | 15 MB each, 5 per announcement |
| Form field | `images` | `documents` |

**Type is decided by magic bytes, never by the filename or the client's
Content-Type** — both are attacker-controlled. An executable renamed to
`.jpg` is rejected before anything touches the disk.

Images are then re-encoded to WebP by sharp, capped at 2000px on the longest
edge. Re-encoding does three jobs at once: it applies and then discards the EXIF
orientation flag so sideways phone photos are stored upright, it destroys **all**
metadata including the GPS coordinates phones embed by default, and it fails on
anything that passed the signature check without really being an image. The
gallery is public and the subjects are students, so shipping the location of
every photo would be a real privacy problem, not a tidiness one.

Stored filenames are UUIDs. The uploader's original name is kept in the database
as metadata only, where a path separator or a second extension inside it cannot
mean anything.

A batch upload handles each file independently. Nine good files in a
drag-and-drop of ten are still saved, and the response lists what was rejected
and why, rather than failing the whole request:

```json
{ "data": { "created": [ ... ], "failed": [ { "filename": "notes.txt", "reason": "Not a supported image..." } ] } }
```

### Swapping storage backends

`src/storage/StorageDriver.ts` is four methods wide — `put`, `remove`,
`exists`, `url`. Nothing outside `src/storage/` knows where a file physically
lives, so a new backend is one file plus a case in `createDriver()`.

Two drivers ship:

- `local` writes to `UPLOAD_DIR`. Right for development and for any host with a
  persistent volume.
- `vercel-blob` writes to Vercel Blob. Required on Vercel, whose filesystem is
  read-only apart from `/tmp`, and whose `/tmp` is discarded when the instance
  is recycled — `local` there returns URLs that 404 shortly afterwards.

Cloudinary or S3 would follow the same shape.

## Gallery

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/v1/gallery` | public — published only, paginated |
| `GET` | `/api/v1/gallery/categories` | public — categories with counts |
| `GET` | `/api/v1/admin/gallery` | admin — includes drafts, filter and search |
| `POST` | `/api/v1/admin/gallery` | admin — multipart upload |
| `PATCH` | `/api/v1/admin/gallery/reorder` | admin — ordered id array |
| `PATCH` | `/api/v1/admin/gallery/:id` | admin — title, caption, alt text, category, published |
| `DELETE` | `/api/v1/admin/gallery/:id` | admin — removes the row and both files |

New uploads are given a **negative sortOrder** so they land at the top of the
gallery. An admin who uploads a photo should see it immediately, not have to
page to the end of the archive.

Reordering runs in a single transaction and is rejected outright if any id is
unknown. A partially applied reorder would leave the gallery in an order nobody
chose, which is harder to spot and harder to undo than an outright failure.

Deletion removes the database row first, then the files. An orphaned file wastes
disk; an orphaned row shows a broken image on the public site, which is worse.

`altText` is required and cannot be blank — a public gallery without it is
unusable with a screen reader.

## Announcements

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/v1/announcements` | public — published only, pinned first |
| `GET` | `/api/v1/announcements/:slug` | public — one announcement with its PDFs |
| `GET` | `/api/v1/announcements/attachments/:id/download` | public — PDF, original filename |
| `GET` `POST` | `/api/v1/admin/announcements` | admin — list including drafts, create |
| `GET` `PATCH` `DELETE` | `/api/v1/admin/announcements/:id` | admin |
| `POST` | `/api/v1/admin/announcements/:id/attachments` | admin — attach PDFs |
| `DELETE` | `/api/v1/admin/attachments/:id` | admin |
| `GET` | `/api/v1/admin/stats` | admin — dashboard counters |

**Bodies are sanitised on write.** `<script>`, `onclick`, `javascript:` URLs and
`<img onerror>` are stripped before storage, and surviving links get
`rel="noopener noreferrer"`. Because what is stored is already safe, no consumer
can forget to escape it — the dashboard, the public page and any future export
all inherit the guarantee.

**Slugs never change.** Editing a title keeps the original address, so links
already shared with students and parents keep working. A duplicate title gets
`-2`, `-3` and so on.

**`publishedAt` is set once.** Unpublishing to fix a typo and republishing does
not shuffle the announcement back to the top of the list.

A draft returns **404, not 403** — a 403 would confirm that something exists at
that address, which is itself a leak. The same applies to a PDF attached to a
draft: having its id is not enough to download it.

## Deployment

The API needs a Node host and a Postgres database. Render or Railway plus Neon
works on free tiers.

1. Set every variable from `.env.example` in the host's dashboard. Generate
   fresh `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — never reuse the local ones.
2. Set `NODE_ENV=production`. This turns on secure cookies and rate limiting,
   and stops error responses including internal detail.
3. Set `CORS_ORIGINS` to the deployed frontend's exact origin, and
   `PUBLIC_BASE_URL` to the API's own public URL — stored file URLs are built
   from it, so getting it wrong breaks every image.
4. Build and start: `npm run build && npm start`.
5. Run `npm run db:migrate` once against the production database, then
   `npm run db:seed` to create the first administrator. **Change that password
   immediately after the first sign-in.**

**Cookies across different domains.** When the API and the site are not on the
same origin — two Vercel projects are exactly that — set `COOKIE_SAMESITE=none`.
A `Lax` cookie is never sent across sites, so refresh fails and every staff
session ends fifteen minutes after sign-in. `none` requires HTTPS, which the
code enforces by forcing the `Secure` flag alongside it. Hosting both under one
domain avoids the question entirely and is still the better arrangement.

**Uploads do not survive a redeploy** on any host that wipes the container
disk, which includes every serverless platform. Either attach a persistent
volume and keep `STORAGE_DRIVER=local`, or set `vercel-blob`.

For a step-by-step Vercel walkthrough covering both, see `../DEPLOYMENT.md`.

## Known advisories

`npm audit` reports 3 high-severity issues in `deepmerge-ts`, reached only
through the Prisma **CLI**. It is a devDependency that never runs in production,
and the only published fix is a downgrade to Prisma 6. Left as is deliberately.

## Status

- [x] **Phase 0** — scaffold, config, database connection, health check
- [x] **Phase 1** — schema and seed
- [x] **Phase 2** — authentication
- [x] **Phase 3** — storage and upload pipeline
- [x] **Phase 4** — gallery
- [x] **Phase 5** — announcements
- [x] **Phase 6** — admin dashboard
- [x] **Phase 7** — public site integration
- [x] **Phase 8** — hardening and handover
