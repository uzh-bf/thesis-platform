# Remove Developer Test Mode

## Goal

Make staging exercise the same application and integration paths as production.
Staging differs only through environment-specific resources and configuration:
database, Blob Storage, Power Automate flows and connections, SharePoint targets,
and secrets.

Remove developer test mode because its database-only simulations bypass the
external systems that staging must validate.

## Decisions

- Keep the `DEVELOPER` user role.
- Remove all special test-data behavior associated with that role.
- Existing test proposals have already been removed manually from staging and
  production.
- Remove staging integration kill switches and automatic role elevation.
- Preserve staging reset and seed tooling for reproducible staging data.
- Do not add a replacement runtime safety gate.

## Runtime Behavior

Staging uses the same request paths as production for:

- proposal publishing,
- student applications and document uploads,
- application acceptance and decline,
- proposal feedback,
- notification emails, and
- CleverReach draft creation.

External failures must be returned through the same error paths as production.
Staging must no longer convert blocked integrations into synthetic
`success/skipped` responses.

The `DEVELOPER` role remains assignable. It retains only legitimate access
permissions that are independent of developer test mode. It must not create
hidden test records, bypass Power Automate, relax form validation, allow repeat
applications, or invoke bulk test-data cleanup.

Staging authentication must use each user's stored database role and admin role.
It must not automatically replace them with `DEVELOPER` and `ADMIN`.

## UI Removal

- Delete `DeveloperTestModeBanner` and its proposal-market integration.
- Remove TEST badges and test-data explanatory tooltips.
- Remove `isDeveloperTestMode` and related application-form branches.
- Restore normal email validation and one-submission behavior for developers.
- Remove developer-only visibility of hidden test proposals and applications.
- Keep ordinary role-based UI permissions that do not depend on test data.

## Server Removal

- Delete developer test proposal scaffold and cleanup helpers.
- Delete developer test proposal creation and deletion procedures.
- Remove direct database simulations for publishing, applying, feedback,
  accepting, and declining.
- Route developer requests through normal production procedures when their role
  authorizes the action.
- Remove test-record filters from proposal, application, statistics, reminder,
  and administrative queries.
- Remove test-specific notification suppression.
- Remove test-specific attachment authorization and direct Blob URL behavior.
- Keep existing production flow payloads, callbacks, and error handling.

## Schema Migration

Add a Prisma migration that drops `Proposal.isTestData`, then remove the field
from `prisma/schema.prisma`.

The migration does not delete records. Test records were removed manually before
this change. Deployment must stop if unexpected test records are discovered
during a pre-deployment check; they must be reviewed and removed deliberately
before applying the column-drop migration.

Remove all application queries, selections, types, and tests that reference the
column.

## Staging Configuration

Remove these runtime variables and their code, deployment-template, reset-tool,
and documentation references:

- `STAGING_ENABLE_EXTERNAL_FLOWS`
- `STAGING_EMAIL_REDIRECT_TO`
- `STAGING_GRANT_ALL_ADMINS`

Keep environment-specific staging values for the database, Blob Storage,
Power Automate endpoints and secrets, SharePoint targets, email behavior, and
CleverReach behavior. Staging flow definitions own their test destinations and
recipients.

Keep staging database reset and seed safeguards, including production-target
rejection. Real staging roles and admin roles must be represented in seeded or
manually managed staging data rather than injected during authentication.

## Documentation

- Remove `docs/developer-test-mode.md`.
- Update staging reset documentation to remove obsolete kill-switch and
  auto-elevation instructions.
- Document a staging end-to-end checklist covering the production-equivalent
  paths and staging-specific resource mapping.

## Verification

### Automated

- Apply and validate the Prisma migration on a disposable database.
- Regenerate the Prisma client.
- Run type-check, lint, and targeted tests.
- Test that users retain database-backed roles in staging.
- Test that staging calls normal external integrations rather than returning
  skipped-success responses.
- Test that developer requests no longer enter direct-database test branches.
- Search the repository for remaining references to `isTestData`, developer test
  mutations, the developer banner, and removed environment variables.

### Staging End to End

1. Publish a supervisor proposal through the staging publishing flow.
2. Submit a student application with CV and transcript.
3. Verify files are read from staging Blob Storage, copied to staging
   SharePoint, and deleted from Blob Storage.
4. Accept and decline applications and confirm persisted state transitions.
5. Submit proposal feedback and confirm callback persistence.
6. Verify expected staging emails and CleverReach behavior.
7. Confirm every run uses staging flow URLs, storage, SharePoint targets, and
   secrets; no production resource may appear in run inputs or outputs.

## Out of Scope

- Removing the `DEVELOPER` role.
- Changing production flow definitions or business logic.
- Replacing staging reset and seed tooling.
- Introducing a new feature-flag or integration kill-switch system.
