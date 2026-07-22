# Staging MySQL Reset

Purpose: reset the staging database to dummy data for end-to-end testing through the same application paths used in production.

## Production parity

Staging does not bypass Power Automate, CleverReach, email notifications, authentication roles, or application validation. It differs from production only through its environment-specific database, Blob Storage account, flow endpoints, SharePoint targets, credentials, and other secrets.

Configure staging integrations with staging-safe destinations. Testing an action in staging can invoke its configured external flow and send notifications.

- `STAGING_REAL_LOGIN_EMAILS=user@uzh.ch`: optional comma-separated real login users to pre-create during a reset.

Pre-created real users receive the normal `UNSET` user and admin roles. Assign roles through the same administration process used in production. Dummy workflow data uses reserved `example.com` recipients. Real login emails are only allowed in `User.email`, not in workflow recipient fields. Reset tooling also refuses targets whose database URL host or database name looks production-like (`prod` or `prd`).

## Commands

Backup staging first with `mysqldump`:

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
