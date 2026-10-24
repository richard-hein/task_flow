# Taskflow — Project Overview

**One sentence:** a multi-tenant task manager (mini-Linear) — users form workspaces (orgs),
orgs hold projects, projects hold kanban tasks, teammates collaborate with comments;
v2/v3 add notifications, admin, search, and file uploads.

## Stack

| Layer    | Tech |
|----------|------|
| Backend  | Express 4 + Mongoose 8 + Zod, TypeScript (`express-backend/`, `tsx watch src/index.ts`) |
| Auth     | Passport-JWT (access cookie) + DB sessions + TOTP MFA + Resend mail |
| Frontend | Next.js + axios `withCredentials` + react-hook-form/Zod + TanStack Query (`next-frontend/`) |
| Later    | BullMQ + Redis (v2 queues), vitest + supertest + mongodb-memory-server (tests), Docker (ops) |

## Repo layout

```
golden-city/
├── express-backend/     # the API (see its WORKFLOW.md for the full build order)
│   └── src/
│       ├── modules/     # auth, mfa, session, user, organization, project
│       ├── database/models/
│       └── common/      # validators, utils, strategies
├── next-frontend/       # the app (orgs, board, members, home, sessions, auth pages)
├── PROJECT.md           # this file — start here
└── (docs live in express-backend/: WORKFLOW.md, FEATURES.md, SECURITY.md, PHASE_TASKS.md)
```

## Current status

| Phase | What | State |
|-------|------|-------|
| 0 | Auth gap fixes (token signing, reset route, session delete verb, cookie flags, branding) | ✅ done |
| 1 | Orgs + members + invites (`/orgs`, `/invites`) | ✅ committed (`1462c3c`) |
| 2 | Projects (CRUD inside orgs, `?archived=`) | 🚧 code complete, **uncommitted** |
| 3 | Tasks: board, move state machine (`todo→doing→done`), float order | ❌ next up |
| 4 | Comments + auto-activity feed | ❌ |
| 5 | Wire/verify frontend against the API | ❌ |
| 6 | Ops: logging, health, tests, Docker, CI (v1 close) | ❌ |
| v2 | Queues, in-app notifications, admin + audit | ❌ |
| v3 | Full-text search, or S3/R2 file uploads | ❌ |

Frontend pages (`/orgs`, `/org/[id]/board`, `/org/[id]/members`, `/home`) are already built
against the API contract — orgs/members should work today; the board 404s until phase 3 lands.

## What's live today

- Full auth: register/login/logout, sliding refresh (15m/30d httpOnly cookies), session
  list/revoke, TOTP MFA, email verify, password forgot/reset.
- Orgs: create, list mine, members CRUD with roles, leave, invites (single-use 7-day codes).
- Projects: create/list per org, rename/archive, delete (admin-only, org-scoped).

Multi-tenancy rule that everything obeys: **every SaaS query filters by `orgId`**;
no membership → 404 (never 403 — don't reveal org existence).

## Next steps

1. Verify + commit phase 2 (`feat: projects`) — note: `npm run build`'s `cp` step fails on
   Windows (`cp` not recognized); `tsc --noEmit` itself passes, the copy-to-dist step is the only issue.
2. Phase 3 — tasks + board + move state machine.
3. Phase 4 — comments + activity → v1 backend complete.
4. Phase 5–6 — frontend wiring, then ops/tests → deploy v1. Then v2/v3.

## Doc map

| Doc | What it answers |
|-----|-----------------|
| `express-backend/WORKFLOW.md` | The full build order, every phase with done-criteria (start at §0 if lost) |
| `express-backend/PHASE_TASKS.md` | Same phases as a short task checklist |
| `express-backend/FEATURES.md` | What each feature is, one line each |
| `express-backend/SECURITY.md` | How auth works + known gaps |
