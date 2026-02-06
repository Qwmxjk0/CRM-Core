# AGENTS.md

## Purpose
`crm-core` is an API-only backend for multiple apps (TrueProfit, SmartPricing, PayTrack).
No frontend is included in this repo.

## Constraints (MVP)
- **Single Supabase project** only (free tier limit)
- Multi-tenant by `org_id`
- Authorization must be enforced by **Supabase RLS**
- Auth method: **Email + Password** only
- Rate limit only **auth endpoints** (signup/login) in MVP

## Architecture
Client App → Vercel Next.js API (crm-core) → Supabase (Auth + Postgres + RLS)
Clients must **not** call Supabase Auth directly.

## Schemas (Single DB)
- `crm`: shared core tables
- `ops`: operational tables (rate limits)
- Optional future schemas per app

## Data Model (MVP)
Schema: `crm`
- `organizations`
- `org_members`
- `contacts`
- `interactions`

Schema: `ops`
- `rate_limits`

## RLS Rules (Required)
Enable RLS on **all crm tables**.
Policy principle: user can read/write rows only if they are a member of that org.
Role rules:
- `viewer`: SELECT only
- `member`: can INSERT interactions, SELECT contacts/interactions
- `admin/owner`: can INSERT/UPDATE contacts and interactions

## API Endpoints (MVP)
Auth:
- `POST /api/auth/signup`
- `POST /api/auth/login`

Bootstrap:
- `POST /api/me/bootstrap`

Me:
- `GET /api/me`

Organizations:
- `GET /api/orgs`

Contacts:
- `GET /api/orgs/:orgId/contacts`
- `POST /api/orgs/:orgId/contacts`
- `GET /api/orgs/:orgId/contacts/:contactId`

Interactions:
- `POST /api/orgs/:orgId/contacts/:contactId/interactions`

## Rate Limit (MVP)
Signup:
- per IP: 5 / 10 minutes
- per email hash: 3 / hour

Login:
- per IP: 20 / 10 minutes
- per email hash: 10 / 10 minutes
- failed login: progressive delay

## Development Rules
- Do not add features outside scope
- Prefer simple over perfect
- Always consider rate limits for endpoints
- No frontend apps in this repo

## MVP Complete When
- Signup/login works
- Auto org bootstrap works
- Can create contacts
- Can create interactions
- Rate limits work
