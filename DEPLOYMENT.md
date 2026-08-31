# Deploying to Vercel

Two Vercel projects, both pointed at this repository, distinguished only by
their **Root Directory** setting: one `frontend`, one `backend`.

Do the backend first — the frontend needs its URL.

---

## Before you start

**Is Vercel the right host for the backend?** For a test deployment, yes, and
everything below is set up for it. For the long run it is worth knowing what
you are accepting:

- Serverless functions are billed per invocation and start cold. A first
  request after an idle period can take a few seconds while Prisma, sharp and
  argon2 load.
- Uploads cannot go on disk, which is why the Blob store below is not optional.
- Rate limiting is held in memory, so each instance counts separately and the
  limits are looser than they look. It still stops a crude flood.
- Processing ten images in one upload has to finish inside the function
  timeout. `vercel.json` asks for 60s, which is enough, but a Hobby project
  caps lower than a Pro one.

A host with a normal long-running process and a disk — Render, Railway, Fly —
avoids all four and costs about the same at this size. The backend runs there
unchanged with `STORAGE_DRIVER=local`. Nothing here locks you in either way.

---

## If the repository does not appear in Vercel

Vercel does not browse GitHub as you. It sees repositories through the **Vercel
GitHub App**, and that app is installed *per GitHub account* by someone with
admin rights on it.

Being a collaborator gives you push access, not the right to install an app on
the owner's account. So if `ADEF` is owned by another personal account, it will
not appear in your import list no matter how many times you reconnect GitHub —
installing the app on your own account only covers repositories your account
owns.

Four ways out, in the order worth trying.

### A. Ask the owner to grant the app — keeps automatic deploys

The owner opens <https://github.com/apps/vercel>, clicks **Configure**, picks
their account, and grants access to `ADEF` (either "All repositories" or "Only
select repositories" with `ADEF` ticked).

The repository then appears in *your* import list, because Vercel checks two
things: that the app can see the repository, and that your linked GitHub
account can too. You already satisfy the second as a collaborator.

This is the one to prefer — every push to `master` redeploys, which is the
whole point of connecting Git.

### B. Move the repository into a GitHub organisation — best long term

Free, and the right shape for a project with more than one person on it.

1. The owner creates an organisation.
2. **Settings → General → Transfer ownership**, moving `ADEF` into it.
3. They add you as a member with **Admin** on the repository.
4. Either of you installs Vercel on the organisation.

GitHub redirects the old URL, so existing clones and remotes keep working
without changes.

### C. Deploy with the CLI — no GitHub connection at all

The fastest way to a working URL, and it does not need the owner. Vercel
uploads the folder directly, so who owns the repository stops mattering.

```bash
npm install -g vercel
vercel login
```

Then deploy each half from its own directory:

```bash
cd backend
vercel            # answer the setup questions; deploys a preview
vercel --prod     # promote to production
```

```bash
cd frontend
vercel
vercel --prod
```

When asked *"In which directory is your code located?"*, answer `./` — you are
already inside the right folder, and each folder's `vercel.json` is picked up
automatically.

Environment variables still have to be set. Either add them in the dashboard
after the first deploy and run `vercel --prod` again, or add them from the
terminal:

```bash
vercel env add DATABASE_URL production
```

The trade-off: **no automatic deploys.** Pushing to GitHub does nothing; you
redeploy by running `vercel --prod` again. Fine for testing, worth replacing
with A or B before this is something the school depends on.

### D. Fork it — last resort

Forking puts a copy under your own account, where Vercel can see it. It works,
but the fork immediately starts drifting from the original and every change has
to travel back as a pull request. Only worth it if the owner is unreachable and
you need automatic deploys today.

---

## Step 1 — A database

Vercel gives you no PostgreSQL, so pick a hosted one. [Neon](https://neon.tech)
has a free tier and is the easiest fit.

1. Create a project. Choose the region nearest your Vercel region.
2. Copy the **pooled** connection string — Neon labels it "Pooled connection".

Use the pooled one. Serverless opens a new connection per cold instance, and a
direct connection string will exhaust the database's connection limit under any
real traffic.

Keep it somewhere for the next step; it becomes `DATABASE_URL`.

## Step 2 — A Blob store for uploads

In the Vercel dashboard: **Storage → Create → Blob**.

Connect it to the backend project you are about to create (or connect it
afterwards). Connecting sets `BLOB_READ_WRITE_TOKEN` automatically.

You also need the store's public origin, which looks like
`https://abc123xyz.public.blob.vercel-storage.com`. It is shown on the store's
page; it becomes `BLOB_BASE_URL`.

> Without this, uploads appear to succeed and then 404 minutes later, because
> Vercel's filesystem is read-only apart from `/tmp` and `/tmp` does not
> survive the instance being recycled.

## Step 3 — Generate two secrets

Run this twice and keep both values:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

They become `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. They must differ, and
each must be at least 32 characters — the server refuses to start otherwise.

## Step 4 — Deploy the backend

**New Project → import this repository.**

- **Root Directory:** `backend`
- **Framework Preset:** Other

If the repository is not in the list, see *If the repository does not appear in
Vercel* above — you are almost certainly a collaborator rather than the owner.
Deploying with the CLI instead means skipping the import entirely; the
environment variables below still apply.

Everything else is already in `backend/vercel.json`.

Add these environment variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | The pooled string from step 1 |
| `JWT_ACCESS_SECRET` | First secret from step 3 |
| `JWT_REFRESH_SECRET` | Second secret from step 3 |
| `STORAGE_DRIVER` | `vercel-blob` |
| `BLOB_READ_WRITE_TOKEN` | Set for you when the store is connected |
| `BLOB_BASE_URL` | The store's public origin, from step 2 |
| `COOKIE_SAMESITE` | `none` |
| `CORS_ORIGINS` | Leave blank for now — step 6 fills it in |
| `APP_URL` | Leave blank for now — step 6 fills it in |

`COOKIE_SAMESITE=none` is what lets the site keep staff signed in. The frontend
and backend will be on different `vercel.app` subdomains, which browsers treat
as different sites, and a `Lax` cookie is never sent across them — so refresh
would fail and every session would end fifteen minutes after sign-in.

Deploy. Note the URL you get, e.g. `https://adef-api.vercel.app`.

## Step 5 — Set up the database contents

The schema is not applied automatically. From your machine, pointed at the
production database:

```bash
cd backend

# Windows PowerShell
$env:DATABASE_URL="<the pooled connection string>"

# macOS / Linux
export DATABASE_URL="<the pooled connection string>"

npx prisma migrate deploy
npm run db:seed
```

`migrate deploy` applies the migrations without prompting. `db:seed` creates
the first administrator from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` and
fills in the site's starting content.

Two things to know about the seed:

- It reads its images from `frontend/src/imports`, so run it from a full
  checkout, not from the deployed function.
- Those images are written to whatever `STORAGE_DRIVER` is set locally. If your
  shell has no `STORAGE_DRIVER`, it defaults to `local` and the seeded images
  land on your laptop rather than in Blob. Set `STORAGE_DRIVER=vercel-blob`,
  `BLOB_READ_WRITE_TOKEN` and `BLOB_BASE_URL` in the same shell to seed them
  into the store.

**Change the seeded password immediately after your first sign-in.** It is in
`.env.example` in plain text, and that file is public.

Check it worked:

```bash
curl https://adef-api.vercel.app/api/v1/health
curl https://adef-api.vercel.app/api/v1/courses
```

## Step 6 — Deploy the frontend

**New Project → import the same repository again.**

- **Root Directory:** `frontend`
- **Framework Preset:** Vite

One environment variable:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://adef-api.vercel.app/api/v1` |

Include `/api/v1`. Without it every request 404s.

This is read at **build** time, not at run time. Changing it later means
redeploying, not just restarting.

Deploy, then note the frontend URL and go back to the **backend** project to
fill in the two variables left blank in step 4:

| Variable | Value |
| --- | --- |
| `CORS_ORIGINS` | `https://adef.vercel.app` |
| `APP_URL` | `https://adef.vercel.app` |

`CORS_ORIGINS` is a comma-separated list with no trailing slashes. `APP_URL` is
what password reset links are built against — get it wrong and the emails point
somewhere that does not exist.

**Redeploy the backend** so it picks them up.

## Step 7 — Email

Until `SMTP_HOST` is set, the API prints password reset links to its logs
instead of sending them. The flow works and you can read the link in the Vercel
function logs, but staff cannot reset their own passwords.

For Gmail, add to the backend project:

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `adeftvet@gmail.com` |
| `SMTP_PASS` | A Google **App Password**, not the account password |
| `MAIL_FROM` | `ADEF TVET School <adeftvet@gmail.com>` |

App Passwords need 2-Step Verification enabled on the Google account.

---

## Checking it works

In order, because each depends on the last:

1. `GET /api/v1/health` returns `"database": { "ok": true }`.
2. The public site loads and the courses show the seeded photographs. If you
   see content but no images, `BLOB_BASE_URL` is wrong. If you see the right
   layout with generic placeholder text, `VITE_API_URL` is not reaching the API
   and the site has fallen back to its bundled copy.
3. Sign in at `/admin/login`.
4. **Reload the dashboard.** Still signed in means the refresh cookie is
   working. Bounced to the login screen means `COOKIE_SAMESITE` is not `none`.
5. Upload a photo in Gallery, then hard-refresh. Still there means Blob is
   working; a broken image means it went to the ephemeral disk.
6. Send a message through the contact form and confirm it appears in Inbox.

## When something is wrong

**CORS errors in the browser console.** `CORS_ORIGINS` does not exactly match
the frontend origin. No trailing slash, and `https`, not `http`.

**Signed out after ~15 minutes, or on every reload.** `COOKIE_SAMESITE` is not
`none`, or the backend is not on HTTPS. Browsers discard a `SameSite=None`
cookie that is not also `Secure`.

**Uploads 404 shortly after appearing.** `STORAGE_DRIVER` is not
`vercel-blob`, so files went to a disk that no longer exists.

**Images from before the move are broken.** Their URLs were written into the
database at upload time against the old `PUBLIC_BASE_URL`. Changing the setting
does not rewrite existing rows — re-upload them, or update the `url` and
`thumbnailUrl` columns directly.

**The site shows placeholder content.** The API is unreachable and the frontend
has fallen back to its bundled static copy. This is deliberate — an outage
degrades the site to how it looked before rather than to a blank page — but it
does mean a broken `VITE_API_URL` looks like a working site until you notice
nothing staff edit is showing.

**500s on the first request after idle, then fine.** A cold start timing out.
Raise `maxDuration` in `backend/vercel.json`, or move the backend to a host
that keeps a process warm.

## Using S3 or Cloudinary instead

`backend/src/storage/StorageDriver.ts` is a four-method interface. Write
another class against it, add a case to `createDriver()` in
`backend/src/storage/index.ts`, and add the driver's name to `STORAGE_DRIVER`
in `backend/src/config/env.ts`. Nothing outside that folder knows where files
live, so no other code changes.
