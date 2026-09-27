# Taskflow — Full Project Workflow (v1 + v2 + v3)

Beginner-guided build order for the Taskflow SaaS. If you don't know what you're building,
start at §0 and work top to bottom — each phase ends with a "done criteria" checklist.
Commit after every phase (`feat: orgs`, `feat: projects`, …).

Companion docs: `FEATURES.md` (what), `SECURITY.md` (how auth works + known gaps).

---

## 0. What you are building

**One sentence:** a multi-tenant task manager (mini-Linear) — users form workspaces
(orgs), orgs hold projects, projects hold kanban tasks, teammates collaborate with
comments, and v2/v3 add notifications, admin, search, and file uploads.

**Stack (already installed):**

| Layer    | Tech |
|----------|------|
| API      | Express 4 + Mongoose 8, `tsx watch src/index.ts` (`backend/package.json:8`) |
| Auth     | Passport-JWT (access cookie) + DB sessions + TOTP MFA + Resend mail |
| Frontend | Next.js + axios `withCredentials` + RHF/Zod + TanStack Query (already built: `/orgs`, `/org/[id]/board`, `/org/[id]/members`, dashboard `/home`) |
| Later    | BullMQ + Redis (v2 queues), `vitest + supertest + mongodb-memory-server` (tests), Docker (ops) |

**Where things stand today:**

- ✅ Auth/MFA/sessions/User models — done, keep as-is (`src/modules/{auth,mfa,session,user}`, `src/database/models/{user,session,verification}.model.ts`).
- ✅ Frontend SaaS pages — built against the API contract below; they 404 until the backend phases land.
- ❌ Backend SaaS (orgs → projects → tasks → comments) — **this doc is the build order.**
- ❌ Queues, admin/audit, search/files — v2/v3, fully specified here (§9–§10).

---

## 1. How this codebase works (read once)

### 1.1 Request lifecycle

```
Client → route (*.route.ts) → Zod validator → auth middleware → controller → service → Mongoose model
                                                                                    → errorHandler
```

- **Route** (`src/modules/<name>/<name>.route.ts`): URL + HTTP verb + which controller runs.
  Example: `session.route.ts:6-8` — `GET /all`, `GET /single`, `GET /:id`.
- **Validator** (`src/common/validators/*.ts`): Zod schemas, e.g. `registerSchema` in
  `auth.validators.ts`. Rejects bad input with 400 before any DB work.
- **Middleware**: `authenticateJWT` (`src/common/strategies/jwt.strategy.ts`) reads the
  `accessToken` httpOnly cookie, loads the user, sets `req.sessionId`. Applied at mount
  time in `src/index.ts:31-33` (e.g. all of `/session` is protected).
- **Controller** (`*.controller.ts`): thin — pulls `req.user/params/body`, calls the service, sets cookies/status.
- **Service** (`*.service.ts`): all business logic + DB calls. This is where you spend 80% of your time.
- **Module** (`*.module.ts`): wires controller + service singletons together.
- **Errors**: throw `AppError` subclasses (`src/common/utils/catch-error.ts`);
  `src/middlewares/errorHandler.ts` maps Zod → 400, `AppError` → its status, else 500.

### 1.2 The pattern you will copy for every feature

Every new feature = clone the `session` trio and fill in:

```
src/database/models/<name>.model.ts        # Mongoose schema
src/modules/<name>/<name>.route.ts         # verbs + paths
src/modules/<name>/<name>.controller.ts    # thin HTTP layer
src/modules/<name>/<name>.service.ts       # logic + queries
src/modules/<name>/<name>.module.ts        # singleton wiring
src/common/validators/<name>.validators.ts # Zod input schemas
# then mount in src/index.ts: app.use(`${BASE_PATH}/<name>`, authenticateJWT, <name>Routes)
```

### 1.3 Auth model you must not break

- Access JWT 15m + refresh JWT 30d, both in **httpOnly cookies** (`src/common/utils/cookie.ts`, `src/config/app.config.ts:9-14`). Frontend never touches tokens — `axios withCredentials` sends them automatically.
- Every JWT carries a `sessionId`; logout deletes that row (`auth.service` logout), reset-password deletes **all** rows for the user. That's how "revocable JWTs" work here.
- MFA gate: if `userPreferences.enable2FA`, login returns `{ mfaRequired: true }` with **no cookies**; `POST /mfa/verify-login` issues them after TOTP check.
- Single-use codes: email-verify (45m) and password-reset (1h) rows are `deleteOne()`d on use; forgot-password is rate-limited (max 2 per 3 min → 429).

### 1.4 The golden rule (multi-tenancy)

> **Every SaaS query filters by `orgId`. Miss once = tenant leak (user B sees org A's data).**

Concretely: `Task.find({ _id: tid, orgId })`, never `Task.findById(tid)`. Membership is
checked first (is this user in this org?), then the data query carries `orgId`. You will
see this repeated in every phase — it's deliberate.

---

## 2. Phase 0 — Fix known gaps first (½ day)

Why first: the frontend already calls the *correct* shapes, so these are live 404s/wrong-verbs
today (`SECURITY.md` §10, `SECURITY.md` §11 table).

| # | Fix | File |
|---|-----|------|
| 1 | Refresh token signed with access options / access with refresh options (swapped) — copy the correct pattern from `mfa.service.ts:152-157` | `src/modules/auth/auth.service.ts:116-118,158-163` |
| 2 | Wire missing `POST /auth/password/reset` (controller exists, route doesn't) | `src/modules/auth/auth.route.ts` (add `authRoutes.post("/password/reset", authController.resetPassword)`) |
| 3 | Session delete via `GET /:id` → change to `DELETE /:id`; also fix `deleteSession` service (currently `findByIdAndUpdate`, should delete scoped to user) | `src/modules/session/session.route.ts:8`, `session.service.ts:46-54` |
| 4 | Enable `secure` + `sameSite` cookie flags for prod (commented out in dev) | `src/common/utils/cookie.ts:15-16` |
| 5 | Rename backend issuer `squeezy.com` → Taskflow brand in MFA + mailer templates | `src/modules/mfa/mfa.service.ts`, `src/mailers/templates/` |

**Done criteria:** `POST /auth/password/reset` returns 200 (not 404); `DELETE /session/:id`
works; login still sets both cookies; `tsc --noEmit` (via `npm run build`) clean.
Commit: `fix: auth route gaps (phase 0)`.

---

## 3. Phase 1 — Orgs + members (build first, ~2–3 days)

**Concepts for beginners:** an `Org` is a workspace. A `Membership` row says "user X belongs
to org Y with role Z". Roles: `admin` (invite, change roles, remove) vs `member` (read/write
tasks). Invites reuse the existing `VerificationCode` model with a new type `ORG_INVITE`
(7-day expiry) — same single-use `deleteOne()` pattern as email verification.

**Files to create:**

- `src/database/models/org.model.ts` — `Org{name, ownerId ref User}` + `Membership{orgId indexed, userId indexed, role: admin|member}` with a **unique compound index** on `(orgId, userId)` (one row per user per org, enforced by Mongo, not app code).
- `src/modules/org/org.{route,controller,service,module}.ts`
- `src/common/validators/org.validators.ts` — `createOrgSchema{name}`, `inviteSchema{email}`, `roleSchema{role: admin|member}`, `acceptInviteSchema{code}`.
- Add `ORG_INVITE` to `src/common/enums/verification-code.enum.ts`.
- Mount in `src/index.ts`: `app.use(`${BASE_PATH}/orgs`, authenticateJWT, orgRoutes)` + `app.use(`${BASE_PATH}/invites`, authenticateJWT, inviteRoutes)` (accept route can live on the org router).

**Endpoints:**

| Method | Path | Who | Behavior |
|--------|------|-----|----------|
| `POST` | `/orgs` | any user | Create org; creator gets `Membership{role:admin}`. Body: `{"name":"Acme"}` |
| `GET` | `/orgs` | any user | List orgs where I have a membership (join, don't just filter by `ownerId`) |
| `GET` | `/orgs/:id/members` | member | List memberships + user basics |
| `PUT` | `/orgs/:id/members/:uid` | admin | Change role. Body: `{"role":"admin"}` |
| `DELETE` | `/orgs/:id/members/:uid` | admin | Remove member (admin can't remove self if last admin — return 400) |
| `POST` | `/orgs/:id/leave` | member | Leave org (same last-admin guard) |
| `POST` | `/orgs/:id/invite` | admin | Create `ORG_INVITE` (7d) + send mail with accept link. Body: `{"email":"…"}` |
| `POST` | `/invites/accept` | any user | `findOne({code, type, expiresAt>$gt now})`; invited **email must match** logged-in user's email; create membership; `deleteOne()` code |

**Middleware pattern you'll reuse everywhere:** `requireOrgMember` (member-or-admin) and
`requireOrgAdmin`. They load `Membership{orgId, userId}`, 404 if none (note: 404, not 403 —
don't confirm/deny org existence to outsiders), attach `req.membership`, call `next()`.

**Done criteria:**

- [ ] Creator is admin; `GET /orgs` shows only my orgs (user B sees zero of A's).
- [ ] B `GET /orgs/<A-id>/members` → 404 (isolation — the golden rule holds).
- [ ] Invite: accept works once; second accept with same code → 404/400.
- [ ] Accept with a different logged-in email → rejected.
- [ ] Non-admin `PUT …/members/…` → 403; last-admin remove/leave → 400.

Commit: `feat: orgs + members + invites`.

---

## 4. Phase 2 — Projects (~1 day)

**Concept:** a project is a task container inside one org (a board). `archived` is soft-delete —
list hides archived by default, nothing is ever hard-deleted here.

**Files:** `src/database/models/project.model.ts` (`Project{orgId indexed ref Org, name, archived:false, timestamps}`), `src/modules/project/*.{route,controller,service,module}.ts`, validators, mount under `/orgs/:id/projects` + top-level `/projects/:pid` for update/delete (always with `orgId` check via membership).

**Endpoints:**

| Method | Path | Who | Behavior |
|--------|------|-----|----------|
| `POST` | `/orgs/:id/projects` | member | Body: `{"name":"Website"}` |
| `GET` | `/orgs/:id/projects` | member | Query: `?archived=false&page=1&limit=20` (cap limit at 50) |
| `PUT` | `/projects/:pid` | member | Rename / archive. Must verify `pid` belongs to an org I'm in |
| `DELETE` | `/projects/:pid` | admin | Delete project + its tasks (or refuse if tasks exist — pick delete-cascade, simpler) |

**Done criteria:** project invisible outside its org; `?archived=` filter works; `tsc` clean.
Commit: `feat: projects`.

---

## 5. Phase 3 — Tasks, the core (~2–3 days)

**Concepts:** a task lives in exactly one project **and** carries a denormalized `orgId`
(both indexed — `orgId` is what enforces tenancy without a join on every read).
`status` is a **state machine**: `todo → doing → done` only. Skipping (`todo → done`) is a
400 — this is the rule the frontend board relies on. `order` is a float: insert between two
tasks by averaging their orders, no renumbering.

**Files:** `src/database/models/task.model.ts`:

```
Task{ projectId indexed ref Project, orgId indexed ref Org,
      title required, desc?, status: todo|doing|done (default todo),
      priority: low|med|high (default med), assigneeId? ref User,
      dueAt?, order: number default 0, timestamps }
```

plus `src/modules/task/*`, validators (`createTask{title, desc?, priority?, assigneeId?, dueAt?}`, `moveTask{status, order?}`).

**Endpoints:**

| Method | Path | Who | Behavior |
|--------|------|-----|----------|
| `POST` | `/projects/:pid/tasks` | member | Create (status `todo`, `order` = max+1). Verify project ∈ my org |
| `GET` | `/projects/:pid/tasks` | member | Board query: `?status=&assignee=&search=&page=&limit=` — `.lean()`, `sort({order:1})`, cap 50 |
| `PUT` | `/tasks/:tid` | member | Edit title/desc/priority/assignee/due (NOT status — status moves only via `/move`) |
| `PUT` | `/tasks/:tid/move` | member | Body: `{"status":"doing","order":1.5}`. Enforce adjacency (`todo→doing`, `doing→done`, plus backwards `doing→todo`, `done→doing` — decide once, document it); else 400 |
| `DELETE` | `/tasks/:tid` | member | Delete task (+ its comments) |

**Done criteria:**

- [ ] `todo → done` direct → 400; legal moves → 200.
- [ ] Board returns sorted by `order`, max 50 rows, `.lean()` (plain objects, faster).
- [ ] Cross-org `PUT /tasks/<other-org-tid>` → 404.
- [ ] Assignee must be an org member, else 400.

Commit: `feat: tasks + board + move state machine`.

---

## 6. Phase 4 — Comments + activity (~1 day, closes v1 backend)

**Concepts:** `Comment` is user content; `Activity` is an automatic audit trail written by the
server on every mutation (create/move/assign/comment) — never trust the client to log itself.

**Files:** `comment.model.ts` (`Comment{taskId indexed, orgId indexed, authorId, body, timestamps}`),
`activity.model.ts` (`Activity{taskId indexed, orgId indexed, actorId, action: created|moved|assigned|commented, detail?, at}`),
`src/modules/comment/*`, `src/modules/activity/*` (read-only route).

**Endpoints:**

| Method | Path | Who | Behavior |
|--------|------|-----|----------|
| `POST` | `/tasks/:tid/comments` | member | Body: `{"body":"…"}` → also writes `Activity{commented}` |
| `GET` | `/tasks/:tid/comments` | member | Paginated, oldest-first |
| `DELETE` | `/comments/:cid` | author or admin | — |
| `GET` | `/tasks/:tid/activity` | member | Newest-first feed of the auto-written rows |

Wire activity writes into the task service (create/move/assign) — one helper
`logActivity({taskId, orgId, actorId, action})`, called, never awaited critically
(fire-and-forget with `.catch()` log so a logging failure can't break the mutation).

**Done criteria:** create → move → comment leaves 3 activity rows; author can delete own
comment; outsider gets 404. Commit: `feat: comments + activity`.

🎉 **v1 backend complete: A + B + C + D + E.** Next: plug in the frontend (§7), then ops (§8).

---

## 7. Phase 5 — Connect the frontend (already built, ~½ day)

The frontend was built against exactly the contract above. For each page, what it calls
(all in `next-frontend/lib/api.ts`) and what "working" looks like:

| Page | Calls | Working = |
|------|-------|-----------|
| `/orgs` | `GET/POST /orgs` | Create org → appears in list → Board/Members buttons route to `/org/<id>/…` |
| `/org/[id]/board` | `GET /orgs/:id/projects`, `POST …/projects`, `GET /projects/:pid/tasks?status=`, `POST …/tasks`, `PUT /tasks/:tid/move`, `DELETE /tasks/:tid` | Project select fills; 3 columns fill; drag **or** `→status` button moves card; ✕ deletes |
| `/org/[id]/members` | `GET …/members`, `POST …/invite`, `PUT …/members/:uid`, `DELETE …/members/:uid` | Invite → member appears after accept; role select persists; Remove works |
| `/home` dashboard | `GET /orgs`, `GET /session/all`, MFA state | Stat cards + recent workspaces + Security card |
| Sidebar/Header | `GET /orgs` | Workspace group + Board/Members links appear inside an org; switcher navigates |

**Troubleshooting (beginners: read this before debugging):**

| Symptom | Cause | Fix |
|---------|-------|-----|
| 404 on `/orgs` etc. | Backend phase not built yet | Build §3 first |
| 401 `AUTH_TOKEN_NOT_FOUND` then redirect `/` | Access cookie expired and refresh failed | `GET /auth/refresh` must succeed — check cookies/phase 0 |
| 403 on role change | Logged in as member, not admin | Promote via DB or creator account |
| Board empty but no error | Wrong `projectId` selected or tasks in another project | Check `pid` + `?status=` params in devtools |
| Invite accept fails | Email mismatch or code reused/expired | Log in as the invited email; codes are single-use |

---

## 8. Phase 6 — Ops + tests (v1 close, ~2 days)

Do these in order — each is small:

1. **Logging:** add `pino-http` + request-id middleware; replace `console.error` in `errorHandler.ts`. Why: production debugging without it is guessing.
2. **Health:** `GET /health` (always 200) + `GET /ready` (200 only if Mongo ping succeeds). Deploy platforms and docker-compose depend on these.
3. **Tests** (`vitest + supertest + mongodb-memory-server`, ~10 tests):
   - register → login → refresh cycle works
   - MFA gate: login returns `mfaRequired`, no cookies, until TOTP verify
   - org isolation: B can't read A's org/members/projects/tasks (the golden rule, automated)
   - move rejects `todo → done` skip
   - invite single-use: second accept fails
   - last-admin guard: removing sole admin → 400
4. **Docker:** `Dockerfile` (node, `npm run build` + `start`) + `docker-compose.yml` (mongo + redis + api). Seed script creates a demo org + project + 3 tasks so a reviewer sees value in 60 seconds.
5. **Docs:** serve Swagger from your Zod schemas at `/docs` (library: `@asteasolutions/zod-to-openapi` — only new dep in v1).
6. **CI:** GitHub Actions — `lint` (currently broken on TS 7 vs eslint-config-next, frontend-only; backend `tsc --noEmit` must pass), `test`, `build`.

**v1 definition of done:** A + B + C + D + E + this section. Deploy it. Use it. Then v2.

---

## 9. v2 — Notifications + Admin & audit (~1 week)

*Why v2, not v1:* both need the v1 data model stable first, and both introduce infrastructure
(Redis) or cross-cutting concerns (roles) that are painful to retrofit mid-v1.

### 9.1 Queue foundation (do this first — everything in v2 rides on it)

**Concept for beginners:** some work must not block the HTTP response. Sending an email takes
~1s; doing it inside `POST /invite` makes the UI hang and loses the email if the server
crashes mid-send. A **queue** (BullMQ + Redis) stores the job durably and a **worker**
process delivers it with retries.

New deps: `bullmq`, `ioredis`. Docker: add `redis` service (compose first, code second).

```
src/queues/queue.ts          # shared connection + queue factory
src/queues/mail.queue.ts     # "mail" queue: { to, subject, html }
src/queues/workers/mail.worker.ts  # concurrency 5, 3 retries w/ backoff
```

Reuse `src/mailers/mailer.ts` + Resend inside the worker (not the route). Routes **enqueue**
(`await mailQueue.add("send", {...})`) and return immediately.

**Done criteria:** stop Redis → invite still returns 200 (job waits); start Redis → email
arrives; worker logs show retry on forced failure.

### 9.2 Notification triggers

Enqueue (never send inline) on:

| Event | Recipient | Payload |
|-------|-----------|---------|
| Org invite (§3) | invited email | accept link + org name + inviter |
| Task assigned (§5 `assigneeId` set/changed) | assignee | task title + project + link — **only if** `userPreferences.emailNotification` is true (field exists today, unused — wire it here) |
| Due-soon digest | each user with tasks `dueAt` within 24h | one daily summary, not one mail per task (cron: BullMQ repeatable job `0 8 * * *`) |

### 9.3 In-app notifications (the bell icon)

**Concept:** email is unreliable as UI (spam, delay). A `Notification` row lets the frontend
render unread state instantly.

`Notification{userId indexed, type: invite|assigned|due|comment, refId (task/org id), read:false, timestamps}`.
Write it in the same service calls that enqueue mail (same `if`, two writes).

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/notifications?unreadOnly=&page=` | Mine only, newest first |
| `PUT` | `/notifications/:id/read` | Mark one; verify `userId` = me |
| `PUT` | `/notifications/read-all` | Mark all mine |

Frontend (v2): bell in `Header.tsx` with unread count (`useQuery(["notifications"])`), dropdown
listing, click → mark read + navigate to `refId`. Poll every 30s (`refetchInterval`) — no
WebSocket in v2 (that's a v3+ upgrade, see §11).

**Done criteria:** assign task → assignee sees unread bell + gets email (if opted in);
digest sends once daily per user, not per task.

### 9.4 Admin + audit

**Concepts:** `User.role: user|admin` (new field, default `user`; first admin seeded via script).
`requireRole('admin')` middleware runs **after** `authenticateJWT`. `Audit` rows are append-only
(server-written, like Activity but global: who did what, from where).

`Audit{actorId, action: login|logout|password_reset|mfa_enabled|invite_sent|task_moved|role_changed, ip, userAgent, at}`.
Write from: login/logout/reset/MFA/invite/task-move services (same fire-and-forget helper pattern as §6).

| Method | Path | Who | Behavior |
|--------|------|-----|----------|
| `GET` | `/admin/users?page=&limit=&search=` | `admin` role | Search by name/email |
| `PUT` | `/admin/users/:uid/role` | `admin` role | Promote/demote (can't demote self) |
| `GET` | `/admin/audit?page=&action=` | `admin` role | Filterable audit feed |

Frontend (v2): `/admin` route + sidebar `Admin` group (visible only if `user.role === 'admin'` —
backend still enforces; hiding UI is UX, not security).

**Done criteria:** non-admin `GET /admin/users` → 403; every login/logout/reset/invite/move
leaves an audit row with ip + userAgent.

Commit trail: `feat: queues + mail worker` → `feat: in-app notifications` → `feat: admin + audit`.

---

## 10. v3 — Search + files (pick ONE first, ~3–4 days each)

*Why last:* both are standalone value-adds with zero dependencies on v2. Ship one, learn, then the other.

### Option A — Full-text search (recommended first: no new infra)

**Concept:** Mongo can index words (`text` index) so `find({$text:{$search:"land"}})` matches
"landing page" without scanning every row.

1. Add to task schema: `taskSchema.index({ title: "text", desc: "text" })`.
2. `GET /orgs/:id/search?q=&type=tasks&page=` — **always** scoped `{ orgId, $text: { $search: q } }`,
   project results `{ orgId, name: /q/i }`. Cap 20. Sort by `score` (`{$meta:"textScore"}`).
3. Frontend: search input in `Header.tsx` → `/org/[id]/search?q=` results page reusing board card components.

**Done criteria:** search "land" finds "Landing page" in my org, zero rows from other orgs
(golden rule applies to search too); empty `q` → 400, not full-table dump.

### Option B — Files: avatars + task attachments (needs object storage)

**Concept for beginners:** never store files in Mongo. The server mints a short-lived
**presigned URL**; the browser uploads straight to S3/R2 (bytes never touch your API);
storage notifies via the returned key, which you save on the record.

New deps: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`. Env: `S3_BUCKET`,
`S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (Cloudflare R2 uses the same SDK with another endpoint).

Flow:

```
1. Client: POST /uploads/presign { filename, contentType, kind: avatar|attachment }
   → server checks membership, returns { uploadUrl (PUT, 5min), key, publicUrl }
2. Client: PUT uploadUrl <bytes> (direct to S3, no backend involved)
3. Client: PUT /users/me { avatarKey }  or  POST /tasks/:tid/attachments { key, filename, size }
   → server stores key (never trusts a client-provided publicUrl)
```

Rules: 5 MB cap, allowlist `image/*, application/pdf` (validated server-side on presign),
attachments listed on the task card, avatars rendered via `Avatar` fallback chain.

**Done criteria:** upload works without hitting API payload limits; forged keys from another
org rejected; deleting a task deletes its attachment rows (S3 objects via lifecycle rule or
worker — document which you chose).

---

## 11. Endpoint reference (all versions)

Base: `${BASE_PATH}` = `/api/v1`. Auth: 🟢 public · 🔒 JWT cookie · 🛡 + org role shown.

**v1 — auth (done):**

| Method + Path | Auth | Body | Result |
|---|---|---|---|
| `POST /auth/register` | 🟢 | `registerSchema{name,email,password,confirmPassword}` | User + `EMAIL_VERIFICATION` mail |
| `POST /auth/login` | 🟢 | `{email,password}` (+user-agent) | Cookies, or `{mfaRequired:true}` |
| `POST /mfa/verify-login` | 🟢 | `{email,code}` | Cookies after TOTP |
| `GET /auth/refresh` | 🍪 refresh | — | New access cookie (+ sliding refresh) |
| `POST /auth/verify/email` | 🟢 | `{code}` | `isEmailVerified=true`, single-use |
| `POST /auth/password/forgot` | 🟢 | `{email}` | ≤2/3min else 429; reset mail |
| `POST /auth/password/reset` | 🟢 | `{password,verificationCode}` | New hash, kills all sessions (§2 fixes wiring) |
| `POST /auth/logout` | 🔒 | — | Deletes one session, clears cookies |
| `GET/POST/PUT /mfa/…` | 🔒 | setup/verify/revoke | TOTP lifecycle |
| `GET /session/all`, `GET /session/single`, `DELETE /session/:id` | 🔒 | — | List/me/revoke (§2 fixes verb) |

**v1 — SaaS (§3–§6):**

| Method + Path | Auth | Body |
|---|---|---|
| `POST /orgs` / `GET /orgs` | 🔒 | `{name}` / — |
| `GET /orgs/:id/members` | 🔒 member | — |
| `PUT /orgs/:id/members/:uid` | 🔒 admin | `{role}` |
| `DELETE /orgs/:id/members/:uid` | 🔒 admin | — |
| `POST /orgs/:id/leave` | 🔒 member | — |
| `POST /orgs/:id/invite` | 🔒 admin | `{email}` |
| `POST /invites/accept` | 🔒 | `{code}` |
| `POST /orgs/:id/projects` / `GET …` | 🔒 member | `{name}` / `?archived=&page=&limit=` |
| `PUT /projects/:pid` / `DELETE …` | 🔒 member/admin | `{name?,archived?}` |
| `POST /projects/:pid/tasks` | 🔒 member | `{title,desc?,priority?,assigneeId?,dueAt?}` |
| `GET /projects/:pid/tasks` | 🔒 member | `?status=&assignee=&search=&page=&limit=` |
| `PUT /tasks/:tid` | 🔒 member | `{title?,desc?,priority?,assigneeId?,dueAt?}` |
| `PUT /tasks/:tid/move` | 🔒 member | `{status,order?}` (adjacent only) |
| `DELETE /tasks/:tid` | 🔒 member | — |
| `POST/GET /tasks/:tid/comments` | 🔒 member | `{body}` |
| `DELETE /comments/:cid` | 🔒 author/admin | — |
| `GET /tasks/:tid/activity` | 🔒 member | — |

**v2 (§9):** `GET /notifications?unreadOnly=&page=` · `PUT /notifications/:id/read` ·
`PUT /notifications/read-all` (all 🔒 self) ·
`GET /admin/users?page=&limit=&search=` · `PUT /admin/users/:uid/role {role}` ·
`GET /admin/audit?page=&action=` (all 🔒 `admin` role).

**v3 (§10):** `GET /orgs/:id/search?q=&type=&page=` (🔒 member) ·
`POST /uploads/presign {filename,contentType,kind}` (🔒 member) ·
`POST /tasks/:tid/attachments {key,filename,size}` · `GET /tasks/:tid/attachments` ·
`PUT /users/me {avatarKey?}`.

---

## 12. File index — where each job will live

```
backend/src/
├── index.ts                  # mount routers (§2–§6, §9–§10 add mounts here)
├── config/app.config.ts      # env: JWT, BASE_PATH, + S3/Redis in v2/v3
├── database/models/
│   ├── user.model.ts         # + role field in v2 §9.4
│   ├── session.model.ts      # as-is
│   ├── verification.model.ts # + ORG_INVITE type in §3
│   ├── org.model.ts          # §3 Org + Membership (unique orgId+userId)
│   ├── project.model.ts      # §4
│   ├── task.model.ts         # §5 (+ text index in v3 §10A)
│   ├── comment.model.ts      # §6
│   ├── activity.model.ts     # §6
│   ├── notification.model.ts # v2 §9.3
│   └── audit.model.ts        # v2 §9.4
├── modules/
│   ├── auth|mfa|session|user # as-is (+ §2 fixes)
│   ├── org/  project/  task/  comment/  activity/  # §3–§6
│   ├── notification/  admin/  # v2 §9.3–§9.4
│   └── upload/  search/       # v3 §10
├── common/
│   ├── validators/           # one file per module above
│   ├── middlewares-in-modules/ requireOrgMember, requireOrgAdmin (§3), requireRole (§9.4)
│   ├── strategies/jwt.strategy.ts  # as-is
│   └── utils/cookie|jwt|bcrypt     # as-is
├── queues/                   # v2 §9.1 (BullMQ + workers)
└── middlewares/errorHandler.ts     # + pino-http in §8
```

---

## 13. Working method (how to not get lost)

1. **One phase at a time.** Finish its done criteria before opening the next. The order is
   load-bearing: orgs → projects → tasks → comments → frontend → ops → v2 → v3.
2. **Test with two users.** Org isolation bugs only show with A *and* B accounts (two browsers
   or incognito). Every phase: "can B see A's stuff?" → must be 404.
3. **Use the frontend as your test UI.** It's already built — register two accounts, create an
   org, invite B, move cards. Faster than curl for happy paths; use tests (§8) for regressions.
4. **Commit per phase**, push, and keep `FEATURES.md`'s v1-cut line updated as you land.

## 14. Glossary (words this doc assumes)

- **Tenant / multi-tenancy:** one app serving many orgs whose data must never mix. `orgId` on every row is the mechanism.
- **Membership:** the join row proving user X is in org Y (with a role). No membership = 404.
- **Sliding refresh:** refresh token expiry extends when used near expiry (30d window, extend if <1d left).
- **TOTP:** time-based one-time password (authenticator app, 6 digits, `speakeasy`).
- **Single-use code:** verification row deleted on use; replay → 404.
- **State machine (tasks):** only adjacent status moves allowed; the server rejects skips.
- **`.lean()`:** Mongoose returns plain objects instead of documents — faster for reads.
- **Presigned URL:** short-lived upload ticket minted by your server, used directly against S3.
- **Worker/queue:** background job processing (BullMQ + Redis) so HTTP responses stay fast.
- **Audit vs Activity:** Activity = per-task feed (members see it); Audit = global admin trail (admins only).
