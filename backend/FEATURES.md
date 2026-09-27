# Taskflow SaaS — Full Project Features (Mini-Linear)

Monolith `Express+Mongoose`, reuses `Advanced_Auth` verbatim. v1 cut at the bottom.

## A. Auth (done — keep as-is)

Register/login/logout, refresh sliding 15m/30d (`auth.service.ts:129-168`), sessions list/revoke, TOTP setup/verify/revoke + `mfaRequired` gate (`auth.service.ts:98-105`, `mfa.service.ts:113-164`), email verify 45m, forgot 2/3min limit + reset 1h kills all sessions, Zod validation, `httpOnly` cookies + `withCredentials`.

## B. Orgs + members (build first)

* `Org{name, ownerId}`, `Membership{orgId+userId unique, role:admin|member}` — 1 model file.
* `POST /orgs` (creator=admin), `GET /orgs` (mine), `GET /orgs/:id/members` (member), `PUT /orgs/:id/members/:uid` (admin: change role), `DELETE` remove, `POST /orgs/:id/leave`.
* Invite: `POST /orgs/:id/invite {email}` (admin) → `Verification{type=ORG_INVITE, 7d}` + mail; `POST /invites/accept {code}` (email must match login user, single-use `deleteOne`).
* Rule: every query filters `orgId`. Miss once = tenant leak.

## C. Projects

* `Project{orgId indexed, name, archived:false}`.
* CRUD per org: `POST/GET /orgs/:id/projects`, `PUT/DELETE /projects/:pid`, `?archived=&page=&limit=`.

## D. Tasks (core)

* `Task{projectId indexed, orgId indexed, title, desc?, status:todo|doing|done, priority:low|med|high, assigneeId?, dueAt?, order}`.
* CRUD: `POST /projects/:pid/tasks`, `PUT /tasks/:tid`, `DELETE /tasks/:tid`.
* Board: `GET /projects/:pid/tasks?status=&assignee=&search=&page=&limit=` — `.lean()`, `sort({order:1})`, cap 50.
* Move: `PUT /tasks/:tid/move {status, order}` — state machine `todo→doing→done` only, else 400.
* v2: bulk assign.

## E. Collaboration

* `Comment{taskId indexed, authorId, body}` — CRUD on `POST /tasks/:tid/comments`.
* `Activity{taskId, orgId, actorId, action, at}` — auto-write on task create/move/assign/comment. `GET /tasks/:tid/activity`.

## F. Notifications (queue story)

* `BullMQ+Redis`: invite mail, assign mail, due-soon digest. Reuse `mailer.ts` + `userPreferences.emailNotification` (unused today).
* In-app: `Notification{userId, type, refId, read}` + `GET /notifications`, `PUT /notifications/:id/read`.

## G. Search + files (pick one for v1)

* Search: Mongo text index on `Task.title`, `GET /orgs/:id/search?q=`.
* Files: avatar/attachment via R2/S3 presigned URL. Pick one, not both.

## H. Admin + audit

* `User.role: user|admin`, `requireRole('admin')` middleware.
* `GET /admin/users?page=&limit=&search=`, `GET /admin/audit`.
* `Audit{actorId, action, ip, userAgent, at}` on login/logout/reset/MFA/invite/task-move.

## I. Frontend (Next.js, reuse existing patterns)

* `/(main)/orgs` (list/create/switch), `/org/[id]/board` (kanban 3 cols, drag → `move`), `/org/[id]/members` (invite form + role select), existing sessions + MFA pages.
* Same `axios withCredentials`, extend `middleware.ts` guard to `/org/*`, same `react-hook-form+Zod`, `TanStack Query` per board col.

## J. Ops (mid-level checkbox)

* `pino-http` + req-id,replace `console.error` in `errorHandler.ts:23`; `GET /health`, `GET /ready` (DB ping).
* `vitest+supertest+mongodb-memory-server` — 10 tests: register→login→refresh, MFA gate, org isolation (B can't read A), move rejects skip, invite single-use.
* `Dockerfile + docker-compose(mongo+redis+api)`, Swagger from Zod at `/docs`, seed demo org, GitHub Actions lint/test/build.
* Fix first: `SECURITY.md §10` gaps (JWT options swap, missing reset route, session verbs, cookie flags, middleware `/`).

## v1 cut

A + B + C + D (move+filter) + E (comments+activity) + J. v2: F + H. v3: G.

→ skipped: estimates, index DDL, API payload examples; add when starting B.
