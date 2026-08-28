# ADEF TVET School

The school's public website, plus an admin dashboard for publishing to it.

Originally generated from
[this Figma design](https://www.figma.com/design/LT2eGd14vfFYEFEKnOhbtE/Build-ADEF-TVET-School-Website).

## Layout

```
ADEF/
├─ src/              the website (Vite + React 18 + Tailwind 4)
│  ├─ app/components/    public sections
│  ├─ app/admin/         the dashboard, at /admin
│  ├─ app/lib/api.ts     API client
│  └─ app/routes.tsx     "/" is the site, "/admin/*" is the dashboard
└─ backend/          the API (Express + TypeScript + PostgreSQL)
```

## Running it

Two terminals. The API first, since the site reads from it.

```bash
# Terminal 1 — API on :4000
cd backend
npm install
cp .env.example .env      # then fill in the two JWT secrets
npm run db:up             # Postgres in Docker
npm run db:migrate
npm run db:seed           # creates the first admin, imports the 21 photos
npm run dev

# Terminal 2 — website on :5173
npm install
npm run dev
```

| | |
| --- | --- |
| Website | <http://localhost:5173> |
| Dashboard | <http://localhost:5173/admin> |
| API health | <http://localhost:4000/api/v1/health> |

Sign in with the `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from
`backend/.env`. **Change that password after the first sign-in.**

`backend/README.md` covers the API in full.

### Why the scripts call `node node_modules/...`

This project lives in a folder whose name contains `&`
(`Backend & Frontend ADEF`). On Windows, npm's generated `.cmd` shims expand
that path unquoted, so `cmd` splits the command at the ampersand and any script
calling a local binary dies with
`'Frontend' is not recognized as an internal or external command`.

Calling each binary through `node` with an explicit path skips the shims and
works everywhere. `npx` is broken by the same thing — use `npm run <script>`.
Renaming the parent folder to drop the `&` would let the plain `vite` / `tsc`
forms work again.

## The dashboard

`/admin` is part of this same app, not a separate build. It is added purely by
new files: `routes.tsx` mounts the untouched `App.tsx` at `/`, so nothing about
the public site's markup or styling changed when the dashboard arrived.

- **Overview** — counts, storage used, recent activity
- **Gallery** — drag-and-drop upload, inline editing, show/hide, drag to reorder
- **Announcements** — write, attach PDFs, save as draft, publish, pin

Sessions survive a page reload without ever putting a token in `localStorage`:
the access token is held in memory and an httpOnly cookie silently restores it.

## The API connection

`VITE_API_URL` (see `.env.example`) points the site at the backend. It is read
at build time, so a production build needs it set before `npm run build`.

**The gallery degrades gracefully.** If the API is unreachable it falls back to
the photos bundled with the site, so the page is never blank. The announcements
section removes itself when there is nothing published, rather than showing an
empty heading.

## Things worth knowing

The `dist/` build bundles ~31 MB of PNGs from `src/imports/`, because those
photos are still imported as the gallery's fallback. Once the API is deployed
and the gallery is genuinely reading from it, dropping the fallback imports
would cut the bundle dramatically — worth doing, but it trades away the
offline-safe behaviour above, so it is a deliberate choice rather than an
obvious win.
