# Admin Information Reassignment Implementation Plan

## Goal

Add full-admin-only inline Professor and Supervisor selectors to Admin
Information Entry Details. Save assignment and Admin Information changes in one
transaction without changing proposal ownership, status, application linkage,
or existing records automatically.

## Implementation sequence

### 1. Isolate assignment-input policy

Files:

- Create `src/lib/adminInfoAssignment.ts`
- Create `src/lib/adminInfoAssignment.test.ts`

Work:

- Define the optional assignment input shape.
- Return no assignment when both fields are absent.
- Reject partial assignment input.
- Reject assignment input unless `adminRole` is `ADMIN`.
- Return the validated Professor ID and Supervisor email for the router.
- Cover absent, valid, partial, coordinator, and unset-role cases with Node tests.

Verification:

- `pnpm exec tsx --test src/lib/adminInfoAssignment.test.ts`

### 2. Make the server update atomic and authorized

File:

- Modify `src/server/routers/_app.ts`

Work:

- Add optional `responsibleId` and `supervisorEmail` fields to
  `adminUpdateAdminInfo` input.
- Pass authenticated `ctx` into the mutation.
- Use the assignment policy helper before database writes.
- Load the current Admin Information entry, proposal, and supervision state.
- Validate the target Professor and Supervisor inside the configured department;
  require `UserRole.SUPERVISOR` for the Supervisor.
- Preserve the existing workflow validation.
- Build Admin Information and supervision updates before executing them.
- Execute both updates in one interactive Prisma transaction.
- Keep `Proposal.ownedByUserEmail`, proposal status, supervision ID, and
  application linkage unchanged.
- Send the existing admin-change notification only when Professor or Supervisor
  changed, including actor and old/new values.
- Keep status automation after the transaction.

Verification:

- TypeScript/build catches input/output and Prisma mistakes.
- Focused browser/API flow confirms transaction behavior against local data.

### 3. Add inline full-admin controls

File:

- Modify `src/components/AdminInfoOverview.tsx`

Work:

- Read session and derive `isAdminOnly` from `adminRole === 'ADMIN'`.
- Extend edit state with selected and original assignment values.
- Initialize assignment values when Entry Details opens.
- Render searchable Professor and Supervisor controls only for full admins.
- Keep existing read-only values for coordinators.
- Reuse already-loaded Professor and Supervisor option data.
- Show name and email in selected values and results.
- Support outside-click close, Escape, visible focus, empty results, and loading.
- Validate both selections before Save.
- Include assignment fields in the existing mutation only for full admins.
- Omit unchanged Admin Information fields for assignment-only saves so the
  correction does not advance workflow state.
- Preserve modal state on failure; keep existing close/refetch behavior on success.

Verification:

- Keyboard and pointer interaction checks in browser.
- Coordinator rendering remains read-only.

### 4. Extend local end-to-end coverage

File:

- Modify `tests/e2e/local-auth-blob.spec.ts` or create a focused Admin
  Information spec if isolation improves readability.

Work:

- Sign in through local OIDC as the seeded full administrator.
- Open Admin Info and an eligible Entry Details modal.
- Confirm Professor and Supervisor combobox controls are visible.
- Change both selections and save.
- Confirm updated values and overview regrouping after refetch.
- Confirm proposal ownership, status, and supervision/application identifiers
  remain stable through an API or database read-back.
- Restore modified seeded data in test cleanup.

- Intercept the local session in a second browser case to verify coordinators
  keep the read-only Professor and Supervisor values.
- Keep coordinator server denial covered by the assignment-policy unit test.

### 5. Quality and browser verification

Commands:

- Format only changed implementation/test files with Prettier.
- `pnpm exec tsx --test src/lib/adminInfoAssignment.test.ts`
- `pnpm lint`
- `pnpm build`
- `pnpm test:e2e` when Docker/local services are available.
- `git diff --check`

Browser checks:

- Full admin sees searchable inline assignment controls.
- Save works for active and completed entries.
- Invalid or unavailable option cannot be saved.
- Coordinator receives read-only values and server-side denial.
- Successful Professor change moves the row to the new grouping.
- Existing Admin Information workflow editing still works.

### 6. Commit and handoff

- Review diff for unrelated changes and generated artifacts.
- Keep `.superpowers/` mockup artifacts uncommitted.
- Commit validated implementation on `codex/admin-info-reassignment`.
- Do not push, open a pull request, deploy, or mutate Samuel Meier's live record.
