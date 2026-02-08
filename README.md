# CRM-Core

API-only backend for multi-tenant CRM workflows (auth, orgs, contacts, interactions).
No frontend app is included in this repo.

## Structure
```
crm-core/
├─ apps/
│  └─ api/                 # Next.js API routes only
├─ supabase/
│  ├─ migrations/          # schema + indexes + RLS policies
│  └─ policies/            # reserved
├─ packages/
│  └─ shared/              # types / validation
├─ AGENTS.md
└─ openapi.yaml            # optional
```

## Local Dev
```
cd apps/api
cp .env.example .env.local
npm install
npm run dev
```

Required env vars:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional env vars:
- `AUTH_EMAIL_REDIRECT_URL` (where users land after clicking Supabase email verification links)

## Supabase
Use a single Supabase project with schemas:
- `crm` for core tables
- `ops` for rate limiting

Run migrations in `supabase/migrations`.

### Deploy / Migrate
```
cp .env.example .env
export SUPABASE_PROJECT_REF=your-project-ref
export SUPABASE_ACCESS_TOKEN=your-access-token
npm run migrate
```

## Vercel (Monorepo)
Set **Root Directory** to repo root and use the default commands.
`vercel.json` points build/output to `apps/api`.

## Smoke Test
```
cd apps/api
export BASE_URL=http://localhost:3000
export SMOKE_EMAIL=smoke@example.com
export SMOKE_PASSWORD=ChangeMe123!
npm run smoke
```
