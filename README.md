# ADEF TVET School

The school's public website and the dashboard staff use to run it.

```
.
├── frontend/    Vite + React. The public site and the admin dashboard.
└── backend/     Express + Prisma + PostgreSQL. The API.
```

The two halves are independent packages with their own `package.json`,
dependencies and deploy configuration. They are kept in one repository because
they are always changed together — a new field on the API almost always means a
new field on a form — but nothing about the layout ties them to being deployed
to the same place.

## Running it locally

You need Node 20+ and a PostgreSQL database.

**Backend** — first time:

```bash
cd backend
cp .env.example .env        # then fill in DATABASE_URL and the two JWT secrets
npm install
npm run db:migrate
npm run db:seed             # creates the first admin and the site's content
npm run dev                 # http://localhost:4000
```

**Frontend**, in a second terminal:

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Sign in at http://localhost:5173/admin/login with the `SEED_ADMIN_*`
credentials from `backend/.env`.

## Checks

Neither package runs tests yet. Both typecheck:

```bash
cd backend  && npm run typecheck && npm run lint
cd frontend && npm run typecheck
```

The frontend check matters more than it looks: Vite compiles through esbuild,
which strips types without checking them, so a type error there will build and
deploy perfectly happily.

There is also `cd backend && npm run test:smoke`, which exercises the API
against a running server.

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md). The short version: they are two separate
Vercel projects pointed at this one repository, one with its **Root Directory**
set to `frontend`, the other to `backend`.

Three settings are easy to miss and each breaks something quietly:

- `STORAGE_DRIVER=vercel-blob` on the backend, or uploads vanish.
- `COOKIE_SAMESITE=none`, or staff are signed out every 15 minutes.
- `VITE_API_URL` on the frontend, or the site shows its built-in placeholder
  content and nothing staff edit ever appears.
