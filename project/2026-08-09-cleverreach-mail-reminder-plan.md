# CleverReach Mail Reminder Implementation Plan

## Plan identity

- Status: approved for execution by the user on 2026-08-09.
- Ceremony: full path. The change adds an external email side effect and coordinated runtime-secret wiring in a second repository.
- Primary repository: `/Users/rschlae/Git/df/thesis-platform`.
- Primary branch: `rs/cleverreach-mail-reminder`.
- Primary target: `main` at planning base `9c54feb9130580a96ff9a3c7cd7da0a258d06540`.
- Current plan: `project/2026-08-09-cleverreach-mail-reminder-plan.md`.
- Related history: `project/2026-07-02-thesis-cleverreach-api-plan.md`.
- Infrastructure repository: `/Users/rschlae/Git/df/df-cloud`.
- Infrastructure base: `origin/stg` at planning revision `3396c4b5e648ce8925078688eb53b53bf2b3a267`; production promotion follows `stg` to `prd`.
- Infrastructure branch to create during Slice 3: `rs/thesispf-mail-relay-secrets` in project-local worktree `trees/rs-thesispf-mail-relay-secrets`.
- Infrastructure companion plan to create as that branch's first commit: `project/2026-08-09-thesispf-mail-relay-secrets-plan.md`.
- MR/PR IDs: none. Rename only the current plan file when an ID becomes known and commit that metadata rename separately.

## Goal

- Problem: app-side CleverReach draft creation succeeds when a supervisor publishes a thesis proposal, but staff are no longer told that the draft is ready for manual review and sending.
- Goal: after a CleverReach thesis mailing draft is created successfully, send a high-importance staff reminder through the same generic `MAIL_SENDING_HTTP_URL` Outlook relay contract used by Careers.
- Outcome: staff receive one reminder containing the thesis title and a link to CleverReach; proposal publication and draft creation remain independent of reminder delivery.

## Non-goals

- Do not send the CleverReach mailing automatically.
- Do not reactivate or edit the retired `UZH BF Thesis Platform - Cleverreach` child flow.
- Do not replace or remove `EMAIL_NOTIFICATION_URL`; existing Thesis notifications still use it.
- Do not change CleverReach templates, filters, subjects, draft content, or recipient segmentation.
- Do not add reminder delivery to `thesispf-ibw`, which does not receive the Thesis CleverReach secrets.
- Do not add a new mail library, template framework, queue, retry worker, database record, or delivery-status UI.
- Do not merge, deploy, write secrets, trigger Infisical syncs, or apply Pulumi without the explicit authority named below.

## Evidence

- Careers `origin/main` at `0faeeea0223d7a379b9ca0d04059e433ccd354ca` is the reference implementation.
- Careers `src/lib/mail/sendMail.ts` reads `MAIL_SENDING_HTTP_URL`, `FLOW_SECRET`, and `MAIL_SENDING_FROM`; it posts JSON with `from`, `to`, `subject`, `bodyAsHtml`, `secret`, and optional mail fields.
- Careers `src/lib/cleverreach/trigger.tsx` sends its reminder only after `createCleverReachDraft` succeeds. Reminder failure is logged separately and does not fail publication or draft creation.
- Thesis `src/server/routers/_app.ts` currently awaits `createThesisProposalCleverReachDraft` and then exits without a staff reminder.
- Thesis `src/lib/cleverreach/thesisProposal.ts` returns `{ mailingId }` after a successful draft create.
- Thesis already has environment-specific management-inbox recipients in `ADMIN_CHANGE_NOTIFICATION_RECIPIENTS`, plus environment resolution in `getNotificationEnvironment`.
- The retired proposal-posting flow sent a high-importance reminder after CleverReach success, from the Thesis `Outlook From Address` to the `Outlook Management Inbox`, including the thesis title.
- df-cloud `origin/stg` and `origin/prd` map `MAIL_SENDING_HTTP_URL`, `FLOW_SECRET`, and `MAIL_SENDING_FROM` for Careers. Thesis currently maps `EMAIL_NOTIFICATION_URL` and `FLOW_SECRET`, while its CleverReach keys are scoped to `thesispf` only.
- No applicable ADR conflicts were found.

## Decisions

- Decision: copy the Careers `sendMail` transport contract into Thesis, including environment-variable names and JSON field names.
- Decision: keep the transport helper generic and place it at `src/lib/mail/sendMail.ts`.
- Decision: place reminder copy and invocation in `src/lib/cleverreach/reminder.ts`; keep the router responsible only for sequencing draft success before reminder delivery.
- Decision: reuse the existing Thesis environment-specific management recipients. Rename the internal recipient constant/function to management-oriented names if required for honest reuse; do not introduce a recipient secret.
- Decision: use `MAIL_SENDING_FROM` for the current Thesis `Outlook From Address` value.
- Decision: use the approved environment-specific Send Email HTTP relay URL for `MAIL_SENDING_HTTP_URL`. The request contract must match Careers exactly; do not assume a secret value or change the existing Thesis `FLOW_SECRET`.
- Decision: verify in staging that the configured relay accepts the existing Thesis `FLOW_SECRET`. A rejection is a configuration blocker; it is not authority to overwrite `FLOW_SECRET` or add an unplanned secret variable.
- Decision: use `process.env.CLEVERREACH_ADMIN_URL?.trim()` with fallback `https://eu2.cleverreach.com/admin`; no deployment configuration is required for the default.
- Decision: preserve the legacy Thesis reminder's `High` importance.
- Decision: reminder failure is non-blocking. It is caught and logged with proposal ID and safe error text after draft success.
- Decision: missing relay configuration warns and skips. The caller must not log a false success when `sendMail` skips.
- Decision: use one branch per repository because GitHub and GitLab cannot share one branch or MR. The two branches form one coordinated feature package, not a native stack.

## Planning-stage review

- Required configured planner: unavailable.
- Native attempt failed before inspection with `Unknown model gpt-5.6-luna`.
- Explicit available-model fallback failed before inspection with `Unknown model xiaomi/mimo-v2.5-pro`; the backend reported an incompatible model set.
- Local Codex CLI fallback failed before inspection because `/opt/homebrew/bin/codex.opencodex-real` was missing.
- User ruling: on 2026-08-09 the user explicitly instructed this session to write the full plan and hand it off for execution despite that unavailable gate.
- Execution requirement: record this waived planning-stage gate in the PR/MR descriptions. All implementation and final review gates remain required.

## Skill routing

- Use `rs-sliced-development-workflow` for slice cadence, plan progress, commits, and finish gates.
- Use `rs-model-routing` for any executor or reviewer dispatch. If the configured specialist remains unavailable, report the exact error; do not silently replace a mandatory final gate.
- Use `rs-infisical-operator` for any secret value access or write. Inspect values-free status and permissions first. Read/write allowlist expansion and every secret write require explicit user approval.
- Use `verification-before-completion` before slice commits and completion claims.
- Use `security-review` for the final code-level security gate.
- Use `thermo-nuclear-code-quality-review` for the final maintainability gate.
- Use `rs-mr-description-writer` before creating or updating the PR/MR.
- Use `rs-babysit-pr` only when the user asks to monitor published review artifacts.

## Delivery topology

### Thesis application package

- Repository: `/Users/rschlae/Git/df/thesis-platform`.
- Branch: `rs/cleverreach-mail-reminder`.
- Target: `main`.
- Owns the relay helper, reminder copy, runtime sequencing, local templates, tests, and this plan.

### df-cloud configuration package

- Repository: `/Users/rschlae/Git/df/df-cloud`.
- Base/target: current `origin/stg`; production follows through the repository's normal `stg` to `prd` promotion.
- Branch: `rs/thesispf-mail-relay-secrets`.
- Worktree: `/Users/rschlae/Git/df/df-cloud/trees/rs-thesispf-mail-relay-secrets`.
- Owns only the `thesispf` ExternalSecret allowlist plus its companion plan.
- The primary df-cloud checkout is dirty with unrelated work. Never implement this slice there.

### Ordering

1. Finish and review the Thesis application branch locally.
2. Finish and preview the df-cloud `stg` branch.
3. Obtain explicit approval for exact Infisical permissions and secret writes.
4. Populate staging values and apply the df-cloud staging change through CI.
5. Deploy the reviewed Thesis application branch to staging through its normal GitOps path.
6. Run one controlled staging smoke.
7. Publish review artifacts when authorized.
8. Promote to production only with separate explicit merge, secret-write, deployment, and smoke authority.

## Authority boundaries

- Local edits, deterministic tests, local commits, and read-only repository inspection are approved by this plan.
- Creating the df-cloud project-local worktree and local branch is approved.
- Pushing branches, creating PRs/MRs, or updating existing PRs/MRs requires explicit publication authority unless the user starts the new session with that authority.
- Infisical profile changes, allowlist expansion, secret writes, and sync triggers require explicit approval for the exact profile, direction, and secret names.
- GitLab Pulumi preview requires a pushed branch and therefore publication authority.
- Pulumi apply, ArgoCD sync, pod restart, deployment, Power Automate change, and any cluster-level mutation require explicit approval.
- Merge and production promotion require explicit approval by name and passing required CI.

## Cluster-level changes

- Proposed: extend only the `thesispf` ExternalSecret mapping with `MAIL_SENDING_HTTP_URL` and `MAIL_SENDING_FROM`.
- Unchanged: `thesispf-ibw`, existing `EMAIL_NOTIFICATION_URL`, existing `FLOW_SECRET`, CleverReach secret names, workloads, services, and network policy.
- Apply path: df-cloud app pipeline for staging, followed by the normal `stg` to `prd` promotion. No live `kubectl patch`.

## Progress

- [x] Careers reminder and `sendMail` request contract mapped from current remote main.
- [x] Thesis draft path, legacy reminder, existing recipient mapping, and existing notification flow mapped.
- [x] df-cloud `stg`/`prd` allowlists and repository flow verified.
- [x] User selected the `MAIL_SENDING_HTTP_URL` Outlook relay approach.
- [x] User instructed creation of this full plan and a new-session execution handoff.
- [x] Primary branch created from verified Thesis `main`.
- [ ] Slice 1: add and verify the generic mail relay helper.
- [ ] Slice 2: send the reminder after successful draft creation.
- [ ] Slice 3: add the df-cloud `thesispf` secret mapping in an isolated worktree.
- [ ] Slice 4: provision and smoke staging after explicit approval.
- [ ] Slice 5: finish reviews, publish artifacts, and prepare production promotion.
- Current slice: plan commit and handoff.
- Next action: in the new session, verify the branch and plan, then start Slice 1.

## Slice 1 - Add the Outlook HTTP relay helper

### Problem

- Thesis has no client for the Careers Send Email HTTP relay contract.

### Do

- Add `src/lib/mail/sendMail.ts` by adapting Careers `src/lib/mail/sendMail.ts` without changing the wire contract.
- Define input fields: `to`, `subject`, `bodyAsHtml`, optional `from`, `cc`, `bcc`, `replyTo`, `sensitivity`, and `importance`.
- Read `MAIL_SENDING_HTTP_URL`, `FLOW_SECRET`, and `MAIL_SENDING_FROM` with trimmed, non-empty semantics.
- POST JSON fields `from`, `to`, `subject`, `bodyAsHtml`, `secret`, plus populated optional fields.
- Warn and return before network I/O when required configuration or recipients are missing.
- Throw a safe error containing status and response text on a non-2xx response.
- Add blank `MAIL_SENDING_HTTP_URL` and `MAIL_SENDING_FROM` entries to `.env.local.template`. Keep `EMAIL_NOTIFICATION_URL`.
- Extend `scripts/verify-cleverreach-thesis.ts` with a fake `globalThis.fetch` and temporary environment values.

### Check

- Assert the outgoing URL, method, headers, and exact JSON field names.
- Assert `secret` is in the body and no secret header is added.
- Assert `importance: 'High'` survives serialization.
- Assert missing configuration and empty recipients make zero fetch calls.
- Assert non-2xx responses reject.
- Restore patched environment and `globalThis.fetch` in `finally` blocks.
- Run `./node_modules/.bin/tsx scripts/verify-cleverreach-thesis.ts`.
- Run `./node_modules/.bin/tsc --noEmit --incremental false --pretty false`.
- Run `pnpm lint`.

### Commit

- `feat(mail): add Outlook HTTP mail relay`

### Review decision

- Main-session verification is sufficient for this isolated helper unless implementation changes the approved wire contract or introduces a new auth boundary.

## Slice 2 - Notify staff after CleverReach draft success

### Problem

- The application creates a draft but does not notify the human operators who must review and send it.

### Do

- Add `src/lib/cleverreach/reminder.ts`.
- Build the subject as `<department> Theses - CleverReach mailing ready for review`, using `NEXT_PUBLIC_DEPARTMENT_LONG_NAME` with `Thesis Platform` fallback.
- Build compact HTML that states a mailing is ready, includes the escaped thesis title, and links to the configured/default CleverReach admin URL.
- Send to the existing environment-specific Thesis management recipients with `importance: 'High'`.
- Keep copy generation testable without network I/O. Allow an injected mail function only as the narrow verification seam; production defaults to `sendMail`.
- In `src/server/routers/_app.ts`, rename the existing admin-specific recipient constant/resolver to management-oriented names and update the existing admin-notification caller.
- After `createThesisProposalCleverReachDraft(draftPayload)` succeeds, call the reminder in a separate `try/catch`.
- If draft creation fails or configuration is incomplete, return exactly as today and do not call the reminder.
- If reminder delivery throws, log `CleverReach thesis proposal reminder failed` with proposal ID and safe error text; do not rethrow.
- Do not log “sent” when the transport skipped because configuration was missing.
- Extend the existing verifier to assert escaped title copy, recipients, subject, admin link, and high importance through an injected mail function.

### Check

- Draft failure path makes zero reminder calls.
- Successful draft path makes exactly one reminder call.
- Reminder failure does not change draft success.
- A title containing `<`, `>`, `&`, quotes, or apostrophes is HTML-escaped.
- Existing admin-change notification recipient behavior remains unchanged after the symbol rename.
- Run `./node_modules/.bin/tsx scripts/verify-cleverreach-thesis.ts`.
- Run `./node_modules/.bin/tsc --noEmit --incremental false --pretty false`.
- Run `pnpm lint`.
- Run `pnpm build` before final branch review; if build requires unavailable environment services, record the exact failure and use the repository's CI build as the required gate.

### Commit

- `feat(cleverreach): notify staff when a thesis draft is ready`

### Intermediate review

- This slice crosses CleverReach and Outlook relay side effects. Commit it, then run one read-only intermediate review using the configured lower-cost reviewer on the exact Slice 1..2 range if that role is available.
- Verify every accepted finding before changing code. Main-session verification closes reviewer-requested corrections that add no new behavior.

## Slice 3 - Map relay secrets into `thesispf`

### Problem

- The Thesis pods cannot read `MAIL_SENDING_HTTP_URL` or `MAIL_SENDING_FROM` from their current ExternalSecret.

### Do

- In `/Users/rschlae/Git/df/df-cloud`, fetch current refs and compare `origin/stg`/`origin/prd` to the planning revisions.
- Audit `git worktree list --porcelain`; reuse an existing worktree only if it already owns the exact branch.
- Create `/Users/rschlae/Git/df/df-cloud/trees/rs-thesispf-mail-relay-secrets` from current `origin/stg` and branch `rs/thesispf-mail-relay-secrets`.
- Create and commit `project/2026-08-09-thesispf-mail-relay-secrets-plan.md` as the branch's first commit. Link this primary Thesis plan and copy only the df-cloud slice, verification, authority gates, and progress.
- Edit only `src/apps/thesispf/functions.ts` plus the companion plan.
- Add `MAIL_SENDING_HTTP_URL` and `MAIL_SENDING_FROM` to the secret-name group used only by `thesispf` alongside the CleverReach keys.
- Keep `FLOW_SECRET` and `EMAIL_NOTIFICATION_URL` in the shared list.
- Keep the `thesispf-ibw` secret list unchanged.

### Check

- `git diff --check`.
- `pnpm exec prettier --check src/apps/thesispf/functions.ts project/2026-08-09-thesispf-mail-relay-secrets-plan.md`.
- `src/apps/thesispf/node_modules/.bin/tsc --noEmit --project src/apps/thesispf/tsconfig.json --pretty false` when the worktree has installed dependencies; otherwise use the repo-supported container/dependency path and record it.
- Render no local Pulumi preview.
- After publication authority, push and run `util/ci/trigger-preview-pipeline.sh --scope app --app thesispf --ref rs/thesispf-mail-relay-secrets`.
- Require a preview showing only the expected `thesispf` ExternalSecret-key additions and no `thesispf-ibw` change.

### Commits

- `docs(project): add thesis mail relay secret plan`
- `chore(thesispf): map mail relay secrets`

### Intermediate review

- The committed ExternalSecret mapping changes a cross-system seam. Run one read-only intermediate review on the exact df-cloud range after CI preview evidence is available.

## Slice 4 - Provision and smoke staging

### Preconditions

- Requires explicit approval for the exact Infisical profile permissions, secret writes, syncs, df-cloud apply, application deployment, and test email.
- Requires reviewed application and df-cloud branches.

### Do

- Use `rs-infisical-operator`; never use raw Infisical commands for project secrets.
- Run values-free `status` and `permissions` for the source Careers profile and destination Thesis profile.
- Required source reads, subject to exact approval: the staging relay URL key and the source holding the current staging Thesis Outlook From Address.
- Required destination writes, subject to exact approval: Thesis staging `MAIL_SENDING_HTTP_URL` and `MAIL_SENDING_FROM`.
- Never print, compare, hash, serialize, or persist values.
- Do not alter Thesis `FLOW_SECRET`. Confirm compatibility only through the controlled staging request result.
- Apply the df-cloud staging app change through GitLab CI after a clean preview and explicit apply approval.
- Verify ExternalSecret readiness and key names only; do not read Kubernetes Secret values.
- Deploy the reviewed Thesis application revision through its normal image and GitOps path after explicit deployment approval.
- Publish one uniquely titled supervisor proposal using test-safe data and the normal staging path.

### Check

- Exactly one CleverReach draft is created.
- Exactly one staff reminder arrives at the staging-safe management recipient.
- Reminder sender is the approved Thesis shared mailbox.
- Reminder subject, escaped title, high importance, and CleverReach link are correct.
- App logs show draft creation and no reminder error.
- The retired CleverReach child flow has no new run.
- A relay 401/403 is treated as a `FLOW_SECRET` compatibility blocker; stop and request a design ruling rather than changing existing secrets.
- Proposal publication remains successful if a deliberately fake relay transport is exercised only in a safe local/fake test; do not intentionally break the live staging relay.

### Progress commit

- Update each repository's plan `Progress` with non-sensitive evidence and commit it with the smallest applicable conventional type.

## Slice 5 - Finish reviews and prepare promotion

### Do

- Run fresh application verification and df-cloud formatting/type checks.
- Run the mandatory final application code-level security review with `security-review`.
- Run `thermo-nuclear-code-quality-review` for final maintainability.
- Run one configured capable reviewer on each exact final repository range. If the mandatory reviewer service remains unavailable, record the exact error and stop before PR/MR publication.
- Resolve or explicitly defer findings with rationale. Re-run affected final gates when behavior or scope changes.
- Update plan progress and compute substantive diff size for each repository.
- Use `rs-mr-description-writer` to prepare whole-branch descriptions.
- Include the waived planning-stage reviewer, exact verification, secret/cluster authority boundaries, and staging evidence status.
- Create draft PR/MR only with publication authority. Do not mark ready or merge without explicit authorization.

### Production promotion

- Promote df-cloud through the normal `stg` to `prd` path; do not cherry-pick directly to `prd` unless repository policy explicitly requires it.
- Obtain exact approval for production Infisical permissions/writes, df-cloud apply, application deployment, and one controlled smoke.
- Configure production `MAIL_SENDING_HTTP_URL` and `MAIL_SENDING_FROM` through the restricted operator without exposing values.
- Verify the relay URL and existing Thesis `FLOW_SECRET` pairing through the controlled production smoke; never overwrite `FLOW_SECRET` on a failed request.
- Confirm exactly one production draft and one management reminder, then monitor safe logs and external flow history.

## Acceptance criteria

- A successful supervisor proposal publication creates one CleverReach draft and then attempts one staff reminder.
- Reminder delivery uses the Careers JSON contract through `MAIL_SENDING_HTTP_URL`.
- Reminder uses the approved Thesis sender and existing environment-specific management recipient.
- Reminder contains an escaped thesis title, CleverReach admin link, and high importance.
- Draft failure prevents reminder delivery.
- Reminder failure never fails proposal publication or deletes/changes the draft.
- Missing mail configuration performs no network request and produces a warning without a false success log.
- Existing `EMAIL_NOTIFICATION_URL` behavior is unchanged.
- `thesispf-ibw` secret mapping and behavior are unchanged.
- Deterministic verification performs no real CleverReach or email request.
- Staging live proof records exactly one draft and one reminder before production promotion.
- Final security, maintainability, and independent review gates pass before publication.

## MR/PR evidence

- Thesis: verifier, TypeScript, lint, build/CI, exact files changed, substantive size, review reports, and staging smoke status.
- df-cloud: exact `origin/stg` base, type/format checks, CI-only app preview, no `thesispf-ibw` change, substantive size, and review reports.
- Operational: key names and status only; never secret values or derived fingerprints.
- No browser screenshots are required because this change has no UI surface.

## Next step

- Start a new session in `/Users/rschlae/Git/df/thesis-platform`, read this plan, verify branch/base/status, and execute Slice 1 only before advancing the plan progress.
