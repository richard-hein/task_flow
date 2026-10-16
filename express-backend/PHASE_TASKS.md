# Task List: Phase 0 – VI (Learn-by-Building) – Golden City SaaS Backend

> Do **one phase at a time**, finish all Done Criteria, run `tsc --noEmit` (build), commit with the exact message, then move to next phase.
> All paths below are relative to `express-backend/`. See `WORKFLOW.md` for endpoints/contract details.

## PHASE 0 – Fix Known Gaps (½ day)

Goal: Fix small mismatches called out in WORKFLOW so the existing auth flow matches the contract the frontend expects.

### Task 0.1: Fix token signing (access/refresh swapped)
- **File to edit:** src/modules/auth/auth.service.ts
- **What to do:**
  - Read how access/refresh tokens are signed around the login/refresh logic. Compare to src/modules/mfa/mfa.service.ts (lines ~152-157) for the correct pattern (correct secret + correct expiry per token type).
  - Ensure access token uses access options/secret (short TTL) and refresh token uses refresh options/secret (long TTL). If currently swapped, correct it.
- **Acceptance:** Access and refresh tokens are signed with their correct options/secrets; login still returns valid httpOnly cookies; no regression in token verification.

### Task 0.2: Add POST /auth/password/reset route
- **File to edit:** src/modules/auth/auth.route.ts
- **What to do:**
  - Verify `authController.resetPassword` exists (controller present per WORKFLOW note). Add route: `authRoutes.post("/password/reset", authController.resetPassword)`.
  - Ensure it uses the correct validator if any (check how other password routes are wired).
- **Acceptance:** POST /auth/password/reset does **not** return 404 (returns appropriate 200/400 based on validation/code validity).

### Task 0.3: Fix session deletion (verb + service scope)
- **Files to edit:**
  - src/modules/session/session.route.ts (change HTTP verb)
  - src/modules/session/session.service.ts (fix delete logic)
- **What to do (route):** Change delete endpoint from GET /:id → DELETE /:id.
- **What to do (service):** Update deleteSession so it **deletes scoped to the current user** (e.g. `findOneAndDelete({ _id: sessionId, userId: req.user._id })` or equivalent). It must not allow deleting another user's session.
- **Acceptance:** DELETE /session/:id works; cannot delete another user's session; response/status correct.

### Task 0.4: Enable secure + sameSite cookie flags for production
- **File to edit:** src/common/utils/cookie.ts
- **What to do:** Make secure + sameSite conditional by environment (dev can remain http-friendly; prod must be secure: true with correct sameSite). Do not break local development.
- **Acceptance:** Cookies still set in dev; prod-ready flags applied when NODE_ENV === 'production'.

### Task 0.5: Rename issuer brand (squeezy.com → Taskflow)
- **Files to edit:**
  - src/modules/mfa/mfa.service.ts
  - Mailer templates under src/mailers/templates/ (any occurrence of squeezy.com or old issuer name)
- **What to do:** Replace issuer/brand to “Taskflow” (or project name). Preserve template variables and formatting.
- **Acceptance:** MFA TOTP issuer label and mail templates show Taskflow branding; no functional regressions.

### Phase 0 – Done Criteria
- [ ] POST /auth/password/reset returns 200 (not 404)
- [ ] DELETE /session/:id works and is scoped to current user
- [ ] Login still sets both httpOnly cookies
- [ ] `npm run build` (`tsc --noEmit`) passes
- [ ] Commit: `fix: auth route gaps (phase 0)`

---

## PHASE 1 – Orgs + Members + Invites (~2–3 days)

Goal: Implement orgs/memberships/invites with strict multi-tenancy. **Golden rule:** every org-scoped query filters by orgId. 404 on no membership (don't reveal org existence). Single-use invite codes.

### Task 1.1: Add ORG_INVITE to verification enum
- **File to edit:** src/common/enums/verification-code.enum.ts
- **What to do:** Add ORG_INVITE = "ORG_INVITE".
- **Result:** VerificationEnum includes EMAIL_VERIFICATION, PASSWORD_RESET, ORG_INVITE.

### Task 1.2: Create org membership/role middlewares
- **Files to create (fixed path – reuse existing `src/middlewares/`, NOT `src/common/middlewares/`):**
  - src/middlewares/require-org-member.middleware.ts
  - src/middlewares/require-org-admin.middleware.ts
- **requireOrgMember(orgIdParam = "id")**
  - Read `req.params[orgIdParam]` as orgId. Require authenticated user (`req.user._id`).
  - Find Membership.findOne({ orgId, userId: req.user._id }). If none → throw AppError with **404** (isolation).
  - Attach `req.membership = { orgId, userId, role }` and call `next()`.
- **requireOrgAdmin(orgIdParam = "id")**
  - First run member check (or call requireOrgMember). If `role !== 'admin'` → throw AppError with **403** (Forbidden).
  - Attach membership, `next()`.
- **Notes:** Use existing AppError/asyncHandler patterns (`src/middlewares/asyncHandler.ts`, `src/common/utils/catch-error.ts`). These will be reused in Phases 2–4.

### Task 1.3: Orgs + invites (reuse existing folders)
- **Reuse:** `src/modules/organization/` (already exists with org.service.ts – do NOT create `src/modules/org/`), `src/common/validators/org.validators.ts` (already exists), `src/database/models/org.model.ts` + `membership.model.ts` (already exist).
- **Files to create:** src/modules/organization/organization.route.ts, organization.controller.ts, organization.module.ts (follow `src/modules/session/session.route.ts` trio pattern + mount in src/index.ts).
- **Mount in:** src/index.ts – `app.use(`${BASE_PATH}/orgs`, authenticateJWT, organizationRoutes)`.
- **Endpoints:** see WORKFLOW.md §3 (POST/GET /orgs, members CRUD, invite + accept).

### Phase 1 – Done Criteria
- [ ] All files created/edited above
- [ ] Isolation + guards verified
- [ ] Build passes
- [ ] Commit: `feat: orgs + members + invites`

---

## PHASE 2 – Projects (~1 day)

Goal: Projects inside orgs. Soft-delete archived. Always org-scoped. See WORKFLOW.md §4.

- **Files to create (pattern: `src/modules/session/` trio):**
  - src/database/models/project.model.ts – `{ orgId indexed ref Org, name, archived default false, timestamps }`
  - src/modules/project/project.route.ts
  - src/modules/project/project.controller.ts
  - src/modules/project/project.service.ts
  - src/modules/project/project.module.ts
  - src/common/validators/project.validators.ts
- **Mount in:** src/index.ts – nested `/orgs/:id/projects` + top-level `/projects/:pid` (always check membership + `orgId`).
- **Endpoints:** POST /orgs/:id/projects, GET /orgs/:id/projects?archived=&page=&limit= (cap 50), PUT /projects/:pid, DELETE /projects/:pid (admin, cascade tasks).

### Phase 2 – Done Criteria
- [ ] Isolation verified (cross-org → 404)
- [ ] `?archived=` filter works
- [ ] Build passes
- [ ] Commit: `feat: projects`

---

## PHASE 3 – Tasks + Board + Move State Machine (~2–3 days)

Goal: Core tasks with denormalized orgId, float order, adjacent-only moves. See WORKFLOW.md §5.

- **Files to create:**
  - src/database/models/task.model.ts – `{ projectId indexed, orgId indexed, title, desc?, status: todo|doing|done, priority: low|med|high, assigneeId?, dueAt?, order default 0, timestamps }`
  - src/modules/task/task.route.ts
  - src/modules/task/task.controller.ts
  - src/modules/task/task.service.ts
  - src/modules/task/task.module.ts
  - src/common/validators/task.validators.ts – `createTask{title,...}`, `moveTask{status, order?}`
- **Mount in:** src/index.ts – `/projects/:pid/tasks` + `/tasks/:tid` + `PUT /tasks/:tid/move`.
- **Rules:** adjacent-only moves (todo→done = 400), `.lean()` + `sort({order:1})` + cap 50, assignee must be org member.

### Phase 3 – Done Criteria
- [ ] State machine correct (todo→done rejected)
- [ ] Tenancy enforced (cross-org → 404)
- [ ] .lean()+order+cap
- [ ] Build passes
- [ ] Commit: `feat: tasks + board + move state machine`

---

## PHASE 4 – Comments + Activity (~1 day, v1 backend complete)

Goal: Comments + automatic Activity (fire-and-forget). See WORKFLOW.md §6.

- **Files to create:**
  - src/database/models/comment.model.ts – `{ taskId indexed, orgId indexed, authorId, body, timestamps }`
  - src/database/models/activity.model.ts – `{ taskId indexed, orgId indexed, actorId, action: created|moved|assigned|commented, detail?, at }`
  - src/modules/comment/comment.{route,controller,service,module}.ts
  - src/modules/activity/activity.{route,controller,service,module}.ts (read-only)
  - src/common/validators/comment.validators.ts
- **Wire-in:** `logActivity()` helper in task/comment services, fire-and-forget with `.catch()` so logging can't break mutations.
- **Endpoints:** POST/GET /tasks/:tid/comments, DELETE /comments/:cid (author or admin), GET /tasks/:tid/activity.

### Phase 4 – Done Criteria
- [ ] 3 activity rows on create→move→comment
- [ ] Permissions correct (author/admin delete, outsider 404)
- [ ] Isolation verified
- [ ] Build passes
- [ ] Commit: `feat: comments + activity`

---

## PHASE 5 – Connect Frontend (~½ day)

Goal: Verify existing Next.js frontend (`next-frontend/`) works against v1 backend. See WORKFLOW.md §7.

- **Files:** no new backend files – verify `next-frontend/lib/api.ts` contract matches §11 endpoint table.
- **Pages:** `/orgs`, `/org/[id]/board`, `/org/[id]/members`, `/home`.

### Phase 5 – Done Criteria
- [ ] Core flows work end-to-end
- [ ] No contract mismatches

---

## PHASE 6 – Ops + Tests (v1 Close) (~2 days)

Goal: Logging, health, tests. See WORKFLOW.md §8.

1. **Logging:** add `pino-http` + request-id; replace `console.error` in src/middlewares/errorHandler.ts
2. **Health:** `GET /health` + `GET /ready` (Mongo ping) in src/index.ts
3. **Tests:** `vitest + supertest + mongodb-memory-server` (~10 tests: auth cycle, MFA gate, isolation, move-reject, invite single-use, last-admin guard)
4. **Docker:** `Dockerfile` + `docker-compose.yml` + seed script
5. **Docs:** Swagger at `/docs` via `@asteasolutions/zod-to-openapi`
6. **CI:** GitHub Actions – backend `tsc --noEmit` must pass

### Phase 6 – Done Criteria (v1 Definition of Done)
- [ ] Health/ready + logging
- [ ] Core regression tests pass
- [ ] Build + tests green
- [ ] End-to-end flows work

## V2 PREVIEW (Reference)
- Queues (BullMQ+Redis), Notifications, Admin+Audit – see WORKFLOW.md §9

## V3 PREVIEW (Reference)
- A) Full-text search (text index)
- B) Files (presigned URLs S3/R2) – see WORKFLOW.md §10
