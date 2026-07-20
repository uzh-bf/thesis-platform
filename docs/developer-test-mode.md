# Developer Test Mode

Users with the `DEVELOPER` role can exercise the full proposal lifecycle **on
production** without interfering with real data: everything they create is
flagged as test data, hidden from everyone else, and never triggers external
side effects.

## Granting the role

- **Admin UI**: an admin opens the *Users* tab on `/admin` and sets the user's
  role to `DEVELOPER` (you cannot change your own role).
- **SQL** (first developer / bootstrap):

  ```sql
  UPDATE "User" SET "role" = 'DEVELOPER' WHERE "email" = 'dev@df.uzh.ch';
  ```

The role takes effect on the next session refresh (sign out/in if needed).

## What a developer can test

While signed in with the `DEVELOPER` role:

- **Publish a supervisor proposal** via the regular publish form. The proposal
  is written directly to the database with `isTestData = true` (including
  attachments and the supervision record). The Power Automate flow, the
  CleverReach newsletter draft, and all notification emails are skipped.
- **Apply to a test proposal** via the regular application form (applications
  and CV/transcript attachments are stored directly, no flow call, no emails).
- **Create a test student proposal** with one click from the banner on the
  proposal market, to exercise the student-proposal feedback workflow
  (accept / tentatively accept / decline / reject).
- **Give feedback and accept/decline applications** on test proposals. Status
  transitions (`OPEN → MATCHED_TENTATIVE → MATCHED`, feedback records,
  `AdminInfo` creation, declining competing applications) mirror what the
  Power Automate callbacks do in production — but only the database is
  touched.

Developer actions that would touch a **real** proposal (feedback, accepting or
declining applications, applying) are rejected with a `FORBIDDEN` error — test
actions are only allowed on proposals flagged as test data.

## Isolation guarantees

Test proposals (`Proposal.isTestData = true`) are excluded from:

- the public/student proposal market (`getStudentProposals`),
- the supervisor proposal list (`getSupervisorProposals` for `SUPERVISOR`),
- the admin proposal overview (`adminGetAllProposals`, unless the caller is a
  developer) and supervision statistics (`adminGetSupervisionStats`),
- the automated student-proposal reminder and auto-withdrawal flow endpoints
  (`getOpenStudentProposalsOlderThan8Weeks`,
  `updateWaitingForStudentProposalsOlderThan1Week`),
- application detail queries for non-developers (`proposalApplications`).

Admin change notifications (`sendAdminChangeNotification`) are suppressed when
the affected proposal is test data, and the application-declined email is
never sent for test proposals.

Only users with the `DEVELOPER` role see test records — marked with an orange
**TEST** badge on cards and in the proposal detail view.

## Cleaning up

Use **"Delete all test data"** in the developer banner on the proposal market
(or the `developerDeleteTestData` tRPC mutation, optionally with a
`proposalId`). Deletion is restricted to rows with `isTestData = true`;
applications, attachments, supervisions, feedback, and admin info are removed
via cascade. Production data can never be deleted through this path.

## Schema

Migration `20260720000000_add_proposal_is_test_data` adds the column:

```sql
ALTER TABLE "Proposal" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
```

Deploy with `pnpm prisma:deploy` as usual.
