# Staging PostgreSQL Reset

Purpose: reset the staging PostgreSQL database to safe dummy data for workflow testing without sending mail to real recipients.

## Email Safety

Staging external flow calls are blocked by default when `DOPPLER_CONFIG=stg`.

Set these only when deliberately testing flows:

- `STAGING_ENABLE_EXTERNAL_FLOWS=true`: allows Power Automate flow calls in staging.
- `STAGING_EMAIL_REDIRECT_TO=address@example.com`: redirects app-originated notification emails to test recipients.
- `STAGING_GRANT_ALL_ADMINS=true`: with `DOPPLER_CONFIG=stg`, upgrades every staging login to `DEVELOPER` with `ADMIN` rights.
- `STAGING_REAL_LOGIN_EMAILS=user@uzh.ch`: optional comma-separated real login users to pre-create as staging admins during a reset.

Only staging values set `STAGING_GRANT_ALL_ADMINS=true`; production values leave it empty. Dummy workflow data uses reserved `example.com` recipients. Real login emails are only allowed in `User.email`, not in workflow recipient fields.

## Commands

Backup staging first:

```bash
pnpm staging:db:backup
```

Dry-run reset:

```bash
pnpm staging:db:reset-seed
```

Execute reset:

```bash
pnpm staging:db:reset-seed:execute
```

Audit email-bearing fields after workflow tests:

```bash
pnpm staging:db:audit
```

## Preserved Tables

- `_prisma_migrations`
- `ApplicationStatus`
- `ProposalFeedbackType`
- `ProposalStatus`
- `ProposalType`
- `TopicArea`

## Wiped Tables

- `Account`
- `VerificationToken`
- `ApplicationAttachment`
- `ProposalAttachment`
- `UserProposalFeedback`
- `ProposalApplication`
- `UserProposalSupervision`
- `AdminInfo`
- `Proposal`
- `User`
- `Responsible`
