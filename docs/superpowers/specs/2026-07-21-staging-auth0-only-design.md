# Staging Auth0-Only Login Design

## Goal

Expose Auth0 as the only NextAuth login provider when `THESIS_PLATFORM_ENV=stg`. Preserve existing provider behavior outside staging.

## Current behavior

`src/lib/authOptions.ts` enables Azure AD whenever `AZURE_AD_CLIENT_ID` is non-empty. Staging loads credentials through the Kubernetes secret referenced by `envFrom`, so empty Azure AD values in `deploy/stg_new/values.yaml` do not prevent Azure AD from appearing.

## Design

Add an explicit staging environment check to Azure AD provider registration. Azure AD is registered only when:

- `THESIS_PLATFORM_ENV` is not `stg`; and
- `AZURE_AD_CLIENT_ID` is a non-empty string.

Auth0 registration remains unchanged. Production and local environments therefore retain current environment-variable-driven behavior, while staging ignores any Azure AD credentials still present in its secret.

## Scope

- Change provider selection in `src/lib/authOptions.ts`.
- Add focused automated coverage for staging and non-staging provider selection if the current test setup supports module-level environment tests cleanly.
- Run type checking, linting, and relevant tests.
- Do not change production deployment values or external secrets.

## Expected behavior

| Environment | Azure AD credentials | Auth0 credentials | Providers shown |
| --- | --- | --- | --- |
| `stg` | Present or absent | Present | Auth0 only |
| Non-staging | Present | Present | Azure AD and Auth0 |
| Non-staging | Absent | Present | Auth0 only |

Staging must have valid Auth0 credentials. If Auth0 credentials are absent, no login provider can be shown; this change does not invent fallback credentials.

## Deployment

Change takes effect after staging image build and redeploy. Verification: open staging sign-in page in a fresh session and confirm only Auth0 appears.
