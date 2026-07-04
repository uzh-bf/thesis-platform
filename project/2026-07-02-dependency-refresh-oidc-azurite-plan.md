# Dependency Refresh, Local OIDC, Azurite Plan

## Goal

Upgrade all direct dependencies to latest stable versions, replace development Auth0 with local OIDC, add local Azurite Blob Storage simulation, and prove app still works with browser-based local verification.

## Non-Goals

- No beta Auth.js v5 migration unless user explicitly accepts beta auth risk.
- No production auth/provider change beyond keeping existing Azure AD/Entra path working.
- No deployment topology rewrite.
- No separate "new" deployment concept. `_new` is only the current repo folder suffix for deploy files.
- No unrelated UI redesign.
- No secret migration in committed files.

## Plan Identity

- Plan path: `project/2026-07-02-dependency-refresh-oidc-azurite-plan.md`
- Branch: `codex/dependency-refresh-oidc-azurite`
- Target branch: `main`
- Base checked: `origin/main` at `b65cd32`
- Current state: Slice 10 complete, verified, ready for commit + PR

## Research Summary

Registry sweep covered every direct dependency and devDependency in `package.json`: 79 packages.

- 27 major updates
- 27 minor updates
- 10 patch updates
- 15 already latest
- 1 deprecated direct package: `@types/uuid`; remove because `uuid` ships types.

Primary sources:

- npm registry metadata via `pnpm view <package> --json` for all 79 direct packages.
- Node.js official release index: Node `24.18.0` latest Node 24 LTS (`Krypton`) as of 2026-07-02; Node `26.4.0` exists but is not LTS and user requested Node 24.
- pnpm npm registry metadata: `pnpm@11.9.0` latest as of 2026-07-02.
- pnpm package manager pin docs: https://pnpm.io/installation and https://pnpm.io/package_json
- Corepack package manager pin docs: https://github.com/nodejs/corepack
- Careers Argo migration pattern inspected locally:
  - `/Users/rschlae/.codex/worktrees/3e03/careers/deploy/stg/migration-job.yaml`
  - `/Users/rschlae/.codex/worktrees/3e03/careers/deploy/prd/migration-job.yaml`
  - `/Users/rschlae/.codex/worktrees/3e03/careers/deploy/stg/kustomization.yaml`
- Distroless image docs: https://github.com/GoogleContainerTools/distroless
- Next.js 16 upgrade docs: https://nextjs.org/docs/app/guides/upgrading/version-16
- Next.js Turbopack docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
- Next.js React Compiler docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler
- React Compiler docs: https://react.dev/reference/react-compiler/configuration
- Prisma 7 upgrade docs: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- NextAuth/Auth.js v5 migration docs: https://authjs.dev/getting-started/migrating-to-v5
- Custom OIDC provider docs: https://authjs.dev/guides/configuring-oauth-providers
- Azurite docs: https://learn.microsoft.com/azure/storage/common/storage-use-azurite
- Azurite connection strings: https://learn.microsoft.com/azure/storage/common/storage-connect-azurite
- Azure Blob JavaScript SDK docs: https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/storage/storage-blob
- TypeScript 6 release notes: https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/
- ESLint 10 migration docs: https://eslint.org/docs/latest/use/migrate-to-10.0.0

## Runtime / Package Manager Findings

Upgrade target:

- Node: `22.18.0` -> `24.18.0` LTS.
- pnpm: `10.15.0` -> `11.9.0`.
- Runtime hardening target: evaluate `gcr.io/distroless/nodejs24-debian13:nonroot`.

Surfaces found:

- `package.json` Volta pin: `node: 22.18.0`, `pnpm: 10.15.0`.
- `package.json` lacks `packageManager`, `engines`, and `devEngines.packageManager`.
- No `pnpm-workspace.yaml`, `.nvmrc`, `.tool-versions`, `vercel.json`, or `vercel.ts` found; this appears to be a single-package app with Volta as the only local runtime pin.
- `Dockerfile` uses `node:22.18.0-alpine` in `deps`, `builder`, `runner`.
- `Dockerfile` runs `corepack prepare pnpm@10.15.0 --activate` in `deps` and `builder`.
- `Dockerfile` installs global `prisma@6.15.0`; deploy migration job runs `prisma migrate deploy` from this image.
- GitHub Actions build Docker images only; no `actions/setup-node` surface currently:
  - `.github/workflows/docker-image-stg.yml`
  - `.github/workflows/docker-image-stg-arm.yml`
  - `.github/workflows/docker-image-prd.yml`
- Deploy manifests use built image; no separate Node runtime image in Helm/Kubernetes manifests.
- Deployment order is staging first, then production after staging proof. Current repo files backing that flow:
  - `deploy/stg_new/values.yaml`
  - `deploy/prd_new/values.yaml`
- Deferred/out-of-scope for this rollout:
  - `deploy/prd_ibw_new/values.yaml`
- `deploy/prd_ibw_new/values.yaml` is a known IBW production surface, but do not update it in this staging -> production rollout.
- Legacy deploy surfaces also exist under `deploy/chart`, `deploy/stg`, and `deploy/prd`; verify whether they are still active before implementation and update them if they are not retired.
- Deploy `chart_new/templates/migration-job.yaml` overrides the container command with `['prisma', 'migrate', 'deploy']`.
- Deploy `chart_new/templates/migration-job.yaml` is already an Argo `PreSync` hook.
- README dev commands mention `pnpm`, no runtime version section.

Decision:

- Update Volta to Node `24.18.0` and pnpm `11.9.0`.
- Add `packageManager: "pnpm@11.9.0"` for Corepack.
- Add `engines` for Node `24.x` and pnpm `11.x`.
- Consider `devEngines.packageManager` with `onFail: "download"` if pnpm 11 behavior works with repo.
- Update all Docker stages to `node:24.18.0-alpine`.
- Update Dockerfile Corepack pin to `pnpm@11.9.0`.
- Keep production migrations on the Argo sync hook path, following careers.
- Replace global Prisma CLI coupling with a package-script-based migration command in a migration-capable job image.
- Add CI/check workflow surfaces with Node 24 if a check/E2E workflow is introduced in this branch.
- Keep image build workflows on Dockerfile-driven Node 24; no separate GitHub `setup-node` change is needed unless a non-Docker check workflow is added.
- Treat environment rollout as staging -> production. Refer to `_new` only when naming the actual files to edit.
- Document local runtime in README.
- Treat distroless as a separate proof slice after basic Node 24, pnpm 11, Next 16, and Prisma 7 are green.

Risk:

- Node 24 may reveal OpenSSL/native package differences, especially Prisma engines and Alpine/musl.
- pnpm 11 may update lockfile format/settings; lockfile must be regenerated and committed with `package.json`.
- Docker deploy migration job currently depends on global `prisma`; version skew against `@prisma/client` must be eliminated while moving to package-script execution.
- Distroless final image has no shell or package manager. The migration hook must not rely on the distroless app runtime image.

## Argo Sync Migration Findings

Careers pattern:

- Environment deploy folders include `migration-job.yaml` as an Argo-synced resource.
- The migration resource is a Kubernetes Job annotated with `argocd.argoproj.io/hook: PreSync`.
- The hook delete policy is `BeforeHookCreation,HookSucceeded`.
- The job runs a package script through `command: ['pnpm', 'migrate']`.
- The job uses environment ConfigMap/Secret injection, bounded resources, `backoffLimit: 1`, `activeDeadlineSeconds: 600`, and `ttlSecondsAfterFinished: 3600`.
- Careers rollout history showed that pnpm inside Kubernetes hook jobs can need `CI=true` to avoid non-TTY aborts; add that if thesis hook runs through `pnpm`.

Current thesis state:

- `deploy/chart_new/templates/migration-job.yaml` already uses Argo `PreSync`.
- The hook currently uses the same image as the app deployment.
- The hook currently runs `command: ['prisma', 'migrate', 'deploy']`.
- The Dockerfile installs global `prisma@6.15.0` only so the deploy migration hook can work.

Decision:

- Migrations must run through Argo sync, like careers.
- Do not move production migrations into app startup, CI deployment scripts, or manual post-deploy commands.
- Keep the thesis migration resource as an Argo `PreSync` hook with `BeforeHookCreation,HookSucceeded`.
- First keep the current direct `prisma migrate deploy` hook compatible with Prisma 7 by matching the global CLI version to package.json and copying Prisma config into the image.
- Then replace direct global `prisma` execution with a migration-capable image or Kubernetes-safe package script, for example `pnpm run prisma:deploy:k8s`, where the script runs `prisma migrate deploy` without Doppler because Kubernetes secrets provide env vars.
- Add `CI=true` to the migration job only when invoking pnpm.
- If the app runtime becomes distroless, the migration hook should use a separate migration-capable image or Docker target that includes Node, pnpm, node_modules, Prisma schema, and migrations.
- Add Helm values for `migration.image` only if the migration image diverges from the app image.
- Verify rendered manifests show the hook annotations, command, image, env, resources, and secret reference for both staging and production.
- When a PreSync hook fails in Argo, hard refresh/reset the stale operation state before judging a retry, matching the careers lesson.

## Distroless Feasibility

Verdict:

- Realistic for the Next.js app runtime if `output: 'standalone'` remains clean.
- Not a drop-in Dockerfile swap because the current Argo migration hook uses the same image and a global Prisma binary.
- More realistic after adopting the careers-style separation: Argo still runs migrations, but the app runtime image no longer has to contain migration tooling.

Why realistic:

- Next standalone output produces `server.js` plus traced runtime files.
- Distroless publishes Node 24 Debian 13 images, including `:nonroot`.
- Distroless Node images use a Node runtime entrypoint; the app can run with vector `CMD ["server.js"]`.

Blockers:

- Current runner uses `npm install -g prisma@6.15.0`; distroless has no npm.
- Current migration job uses `command: ['prisma', 'migrate', 'deploy']`; distroless has no global `prisma` binary.
- Current Docker build uses Alpine/musl. Distroless is Debian/glibc. Prisma/native module targets must match runtime.
- No shell means harder production debugging; need documented `debug-nonroot` target or fallback.

Recommended path:

1. Move build/runtime compatibility toward Debian Node 24 for native module parity.
2. Keep migration image capability separate from app runtime, following the Argo sync hook pattern.
3. Switch only app runner to `gcr.io/distroless/nodejs24-debian13:nonroot`.
4. Update Helm values/templates if migration image diverges from app image.
5. Prove local Docker runtime, migration job, health route, auth, and Azurite upload.

Fallback:

- If migration image split is too much for this branch, keep Node 24 slim/Alpine hardened runtime and leave distroless for a follow-up branch.

Decision:

- Add distroless as proof slice, not as a mandatory first-pass runtime change.
- Adopt only if migration execution and Prisma native targets are clean.

## React Compiler / Turbopack Findings

Targets:

- `babel-plugin-react-compiler@1.0.0`
- `eslint-plugin-react-hooks@7.1.1` if compiler-aware linting is needed.
- Next 16 Turbopack default for `next dev` and `next build`.

Docs findings:

- Next 16 uses Turbopack by default for development and production builds.
- Explicit `--turbopack` flags are no longer needed.
- If custom webpack config exists, Next 16 build fails by default unless migrated or `--webpack` is used. Current `origin/main` has a Matomo webpack alias in `next.config.js`; full Turbopack adoption must migrate or replace this alias.
- React Compiler support is stable in Next 16 but opt-in via `reactCompiler`.
- Stable React Compiler path uses `babel-plugin-react-compiler`.
- Turbopack Rust React Compiler exists and avoids Babel plugin, but must be verified against the installed Next version before relying on it.

Decision:

- Fully adopt Turbopack by using Next 16 defaults and avoiding `--webpack`, after removing or replacing the Matomo webpack alias.
- Enable React Compiler with stable `reactCompiler: true` after framework upgrade.
- Start with full app compilation.
- Go/no-go: keep full React Compiler only if lint, `tsc`, build, and browser smoke pass without broad purity/rules violations. If broad violations appear, switch to annotation mode, record deferred fixes, and keep Turbopack adoption separate.
- Evaluate `turbopackRustReactCompiler` only after stable compiler path is green; adopt it only if documented and build-proven.
- Add lint/compiler diagnostics if updated React hooks tooling supports it cleanly.

Risks:

- React Compiler may expose purity/rules-of-hooks issues in existing components.
- Private `@uzh-bf/design-system` may need extra transpilation or compiler exclusion if it ships incompatible code.
- Turbopack can fail on webpack-only assumptions. The Matomo webpack alias is known risk.

## Major Upgrade Findings

### Next.js / React / ESLint / TypeScript

- `next`: `15.3.4` -> `16.2.10`
- `eslint-config-next`: `13.4.19` -> `16.2.10`
- `react`: `19.1.1` -> `19.2.7`
- `react-dom`: `19.1.1` -> `19.2.7`
- `typescript`: `5.9.2` -> `6.0.3`
- `eslint`: `8.48.0` -> `10.6.0`
- `@tsconfig/node18`: replace with `@tsconfig/node24@24.0.4`

Risk:

- Next 16 requires Node `20.9+`; repo already pins Node `22.18.0`.
- `next lint` removed/deprecated path means `lint` script likely must move to ESLint CLI.
- ESLint 10 expects flat config. Existing `.eslintrc.json` is legacy.
- TypeScript 6 can surface type breaks, especially older plugin/type packages.
- Pages Router remains supported.

Decision:

- Upgrade Node/pnpm first or with this framework slice so local, CI, Docker, and TypeScript assumptions line up.
- Upgrade Next/React/TypeScript together.
- Replace `.eslintrc.json` with flat `eslint.config.mjs`.
- Change `lint` script from `next lint` to `eslint .`.
- Change `tsconfig.json` from `@tsconfig/node18` to `@tsconfig/node24`.
- Keep `next.config.js` CommonJS unless Next 16 forces change.

New feature candidates:

- Next 16 Turbopack production builds; adopt in this branch.
- React Compiler; adopt in this branch after framework upgrade.
- React 19.2 diagnostics/perf improvements; no product behavior change beyond compiler.
- TypeScript 6 modern checking; fix surfaced issues, do not relax globally.

### Prisma 7

- `prisma`: `6.15.0` -> `7.8.0`
- `@prisma/client`: `6.15.0` -> `7.8.0`

Risk:

- Prisma 7 changes client generation defaults. New `prisma-client` generator expects explicit output.
- Driver adapters are now the direction for JS clients. PostgreSQL should use `@prisma/adapter-pg`.
- Existing imports rely on `@prisma/client` and generated Prisma namespace.
- Schema has `binaryTargets`; may be obsolete if moving to new generator.
- Next standalone/Docker must include generated client output.

Decision:

- Prefer minimal Prisma 7 migration that keeps app behavior stable.
- Add `@prisma/adapter-pg` and `pg` if needed by Prisma 7 selected path.
- Update `src/server/prisma.ts` only after `prisma generate` proves client import path.
- Keep database provider as PostgreSQL.
- Verify both normal schema and `schema.mysql.prisma` generation story before removing anything.

New feature candidates:

- JS driver adapter path can simplify native binary target issues later.
- Avoid adopting Prisma Accelerate/client extensions in this branch.

### NextAuth / Auth.js

- `next-auth`: `4.24.11` -> `4.24.14` latest stable.
- `next-auth@beta`: `5.0.0-beta.31`.
- `@next-auth/prisma-adapter`: already latest `1.0.7`.
- `@auth/prisma-adapter`: current stable `2.11.2`, used by Auth.js v5 path.

Risk:

- Full v5 migration is not latest stable; npm `latest` is v4.
- v5 changes config shape, recommends shared `auth.ts`, `handlers`, and often `@auth/prisma-adapter`.
- This repo is Pages Router with `pages/api/auth/[...nextauth].ts`, `getServerSession`, `useSession`, custom JWT encode/decode, Prisma adapter, AzureAD provider, Auth0 provider.
- Combining Auth.js beta migration with Prisma 7 and Next 16 raises auth blast radius.

Decision:

- Upgrade stable `next-auth` patch only.
- Do not migrate to Auth.js v5 in this branch.
- Replace development Auth0 provider with custom generic OIDC provider backed by local `navikt/mock-oauth2-server`.
- Keep AzureAD provider for staging/production.
- Add plan note: v5 beta migration can be separate branch after dependency refresh is green.

New feature candidates:

- v5 `auth()` universal API and preview OAuth support are worth future review.
- Not adopted now because beta and auth-critical.

### Azurite / Azure SDK

- `@azure/storage-blob`: `12.15.0` -> `12.33.0`
- `@azure/identity`: `3.3.0` -> `4.13.1`
- Add Azurite Docker service, likely image `mcr.microsoft.com/azure-storage/azurite`.

Risk:

- Current browser upload creates `BlobServiceClient` from `NEXT_PUBLIC_BLOBSERVICECLIENT_URL + SAS_STRING`.
- Current SAS generation uses `StorageSharedKeyCredential` with account name/key.
- Azurite default account is `devstoreaccount1` with fixed dev key and HTTP endpoint.
- Browser must reach Azurite via the project-local host port `http://127.0.0.1:11000/devstoreaccount1`; Azurite still listens on its standard `10000` port inside compose.
- `NEXT_PUBLIC_BLOBSERVICECLIENT_URL` must be the account URL ending in `?` because the existing client code calls `getContainerClient` with `NEXT_PUBLIC_CONTAINER_NAME`.
- Server running inside Docker may need different endpoint host than browser.
- Slice 1 keeps local OIDC as a running mock only. The documented host-run path uses `.env.local`; the compose `next` profile stays a container smoke path until a routed issuer can be shared by browser and server.

Decision:

- Add storage helper for account name, key, container, and browser service URL.
- Keep direct browser SAS upload pattern.
- Add local `AZURE_STORAGE_ACCOUNT_ACCESS_KEY`, `NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_NAME`, `NEXT_PUBLIC_CONTAINER_NAME`, `NEXT_PUBLIC_BLOBSERVICECLIENT_URL` dev values for Azurite.
- Add script to create `uploads` container in Azurite before local browser smoke.
- Do not commit real storage keys.

New feature candidates:

- Future: move upload through server API to avoid public SAS construction logic in browser. Out of scope.

### FontAwesome

- `@fortawesome/fontawesome-svg-core`: `6.7.2` -> `7.3.0`
- `@fortawesome/free-regular-svg-icons`: `6.7.2` -> `7.3.0`
- `@fortawesome/free-solid-svg-icons`: `6.7.2` -> `7.3.0`
- `@fortawesome/react-fontawesome`: `0.2.2` -> `3.3.1`

Risk:

- Icon package major bumps can rename/remove exports or adjust tree-shaking.
- React wrapper jump is large.

Decision:

- Upgrade as one group.
- Compile catches missing icon exports.
- Browser smoke checks visible header/admin icons if present.

New feature candidates:

- None for current branch.

### Date / Validation / Utility Majors

- `date-fns`: `2.30.0` -> `4.4.0`
- `uuid`: `^11.0.5` -> `14.0.1`
- `@types/uuid`: remove, deprecated.
- `ramda`: `0.29.0` -> `0.32.0`
- `@types/ramda`: `^0.29.0` -> `0.32.0`
- `type-fest`: `4.5.0` -> `5.7.0`
- `yup`: `1.6.1` -> `1.7.1`
- `zod`: `^4.1.3` -> `4.4.3`

Risk:

- `date-fns` major can change ESM/types/import behavior.
- `uuid` major can change Node/runtime support, but repo imports `v4 as uuidv4`.
- `type-fest` can affect app-only type aliases.
- `ramda` type changes can expose compile errors.

Decision:

- Upgrade together after framework compile is stable.
- Fix compile/runtime issues only where surfaced.

New feature candidates:

- None for current branch.

### Tooling / CLI Majors

- `concurrently`: `^9.2.0` -> `10.0.3`
- `dotenv-cli`: `7.3.0` -> `11.0.0`
- `nodemailer`: `6.9.4` -> remove if unused; `next-auth@4.24.14` optional peer wants `^7.0.7`
- `cross-fetch`: `3.1.5` -> `4.1.0`
- `cssnano`: `7.1.1` -> `8.0.2`
- `prettier-plugin-organize-imports`: `3.2.3` -> `4.3.0`
- `react-dropzone`: `14.2.3` -> `15.0.0`

Risk:

- Script behavior may change for `concurrently` and `dotenv-cli`.
- `react-dropzone` API/types may alter accept/dropzone props.
- `nodemailer` is a commented EmailProvider-only dependency. Remove instead of carrying an incompatible unused optional peer.
- `cross-fetch` may be removable because modern Node has fetch, but leave removal for separate cleanup unless safe.

Decision:

- Upgrade and validate scripts.
- Do not remove packages unless unused and verified.

New feature candidates:

- None for current branch.

## Minor/Patch Upgrade Findings

Minor/patch upgrades will be applied after major upgrade plan is clear. These still require build + browser verification, but no detailed changelog gate unless a failure points at the package.

| Package                             |    Current |    Latest | Type  | Research                                                 |
| ----------------------------------- | ---------: | --------: | ----- | -------------------------------------------------------- |
| `@azure/storage-blob`               |  `12.15.0` | `12.33.0` | minor | Azure SDK changelog/docs checked for Azurite/SAS path    |
| `@microsoft/microsoft-graph-types`  |   `2.38.0` |  `2.43.1` | minor | registry + repo metadata                                 |
| `@tailwindcss/postcss`              |  `~4.1.12` |   `4.3.2` | minor | Tailwind group                                           |
| `@tanstack/react-query`             |  `^5.85.5` | `5.101.2` | minor | v5 same major                                            |
| `@tanstack/react-query-devtools`    |  `^5.85.5` | `5.101.2` | minor | v5 same major                                            |
| `@trpc/client`                      |   `11.5.0` | `11.18.0` | minor | v11 same major                                           |
| `@trpc/next`                        |   `11.5.0` | `11.18.0` | minor | v11 same major                                           |
| `@trpc/react-query`                 |   `11.5.0` | `11.18.0` | minor | v11 same major                                           |
| `@trpc/server`                      |   `11.5.0` | `11.18.0` | minor | v11 same major                                           |
| `@uzh-bf/design-system`             |   `4.0.11` |   `4.1.6` | minor | private/local package metadata only; verify UI carefully |
| `autoprefixer`                      |  `10.4.15` |  `10.5.2` | minor | PostCSS group                                            |
| `axios`                             |    `1.5.1` |  `1.18.1` | minor | v1 same major                                            |
| `postcss`                           |   `8.4.47` |  `8.5.16` | minor | PostCSS group                                            |
| `prettier`                          |    `3.6.2` |   `3.9.4` | minor | v3 same major                                            |
| `prettier-plugin-tailwindcss`       |  `~0.6.14` |   `0.8.0` | minor | plugin peer compatibility with Prettier 3                |
| `react-hot-toast`                   |    `2.4.1` |   `2.6.0` | minor | v2 same major                                            |
| `tailwind-merge`                    |    `3.3.1` |   `3.6.0` | minor | v3 same major                                            |
| `tailwindcss`                       |  `~4.1.12` |   `4.3.2` | minor | Tailwind 4 same major                                    |
| `trpc-to-openapi`                   |   `^3.0.1` |   `3.3.0` | minor | v3 same major                                            |
| `tsx`                               |  `^4.19.2` |  `4.23.0` | minor | v4 same major                                            |
| `tw-animate-css`                    |   `~1.3.4` |   `1.4.0` | minor | v1 same major                                            |
| `@microsoft/microsoft-graph-client` |    `3.0.5` |   `3.0.7` | patch | registry metadata                                        |
| `@tailwindcss/forms`                |  `~0.5.10` |  `0.5.11` | patch | registry metadata                                        |
| `@tailwindcss/typography`           |  `~0.5.16` |  `0.5.20` | patch | registry metadata                                        |
| `@types/jsonwebtoken`               |   `^9.0.0` |  `9.0.10` | patch | registry metadata                                        |
| `dayjs`                             | `^1.11.13` | `1.11.21` | patch | registry metadata                                        |
| `formik`                            |    `2.4.6` |   `2.4.9` | patch | registry metadata                                        |
| `jsonwebtoken`                      |    `9.0.1` |   `9.0.3` | patch | registry metadata                                        |
| `next-auth`                         |  `4.24.11` | `4.24.14` | patch | stable latest only; v5 beta deferred                     |
| `nextjs-cors`                       |    `2.2.0` |   `2.2.1` | patch | registry metadata                                        |
| `ts-node`                           |   `10.9.1` |  `10.9.2` | patch | registry metadata                                        |

Already-latest direct dependencies:

`@next-auth/prisma-adapter`, `@tailwindcss/aspect-ratio`, `@types/archiver`, `@uidotdev/usehooks`, `archiver`, `localforage`, `node-fetch`, `standard-version`, `tailwindcss-animate`, `tailwindcss-radix`, `ts-node-dev`.

## Full Dependency Research Inventory

| Package                               |    Current |                                        Latest | Type                 | Source                                                            |
| ------------------------------------- | ---------: | --------------------------------------------: | -------------------- | ----------------------------------------------------------------- |
| `@azure/identity`                     |    `3.3.0` |                                      `4.13.1` | major                | https://github.com/Azure/azure-sdk-for-js                         |
| `@azure/storage-blob`                 |  `12.15.0` |                                     `12.33.0` | minor                | https://github.com/Azure/azure-sdk-for-js                         |
| `@fortawesome/fontawesome-svg-core`   |    `6.7.2` |                                       `7.3.0` | major                | https://github.com/FortAwesome/Font-Awesome                       |
| `@fortawesome/free-regular-svg-icons` |    `6.7.2` |                                       `7.3.0` | major                | https://github.com/FortAwesome/Font-Awesome                       |
| `@fortawesome/free-solid-svg-icons`   |    `6.7.2` |                                       `7.3.0` | major                | https://github.com/FortAwesome/Font-Awesome                       |
| `@fortawesome/react-fontawesome`      |    `0.2.2` |                                       `3.3.1` | major                | https://github.com/FortAwesome/react-fontawesome                  |
| `@microsoft/microsoft-graph-client`   |    `3.0.5` |                                       `3.0.7` | patch                | https://github.com/microsoftgraph/msgraph-sdk-javascript          |
| `@microsoft/microsoft-graph-types`    |   `2.38.0` |                                      `2.43.1` | minor                | https://github.com/microsoftgraph/msgraph-typescript-typings      |
| `@next-auth/prisma-adapter`           |    `1.0.7` |                                       `1.0.7` | same                 | https://github.com/nextauthjs/next-auth                           |
| `@prisma/client`                      |   `6.15.0` |                                       `7.8.0` | major                | https://github.com/prisma/prisma                                  |
| `@tailwindcss/aspect-ratio`           |   `~0.4.2` |                                       `0.4.2` | same                 | https://github.com/tailwindlabs/tailwindcss-aspect-ratio          |
| `@tailwindcss/forms`                  |  `~0.5.10` |                                      `0.5.11` | patch                | https://github.com/tailwindlabs/tailwindcss-forms                 |
| `@tailwindcss/postcss`                |  `~4.1.12` |                                       `4.3.2` | minor                | https://github.com/tailwindlabs/tailwindcss                       |
| `@tailwindcss/typography`             |  `~0.5.16` |                                      `0.5.20` | patch                | https://github.com/tailwindlabs/tailwindcss-typography            |
| `@tanstack/react-query`               |  `^5.85.5` |                                     `5.101.2` | minor                | https://github.com/TanStack/query                                 |
| `@tanstack/react-query-devtools`      |  `^5.85.5` |                                     `5.101.2` | minor                | https://github.com/TanStack/query                                 |
| `@trpc/client`                        |   `11.5.0` |                                     `11.18.0` | minor                | https://github.com/trpc/trpc                                      |
| `@trpc/next`                          |   `11.5.0` |                                     `11.18.0` | minor                | https://github.com/trpc/trpc                                      |
| `@trpc/react-query`                   |   `11.5.0` |                                     `11.18.0` | minor                | https://github.com/trpc/trpc                                      |
| `@trpc/server`                        |   `11.5.0` |                                     `11.18.0` | minor                | https://github.com/trpc/trpc                                      |
| `@tsconfig/next`                      |    `1.0.5` |                                       `2.0.6` | major                | https://github.com/tsconfig/bases                                 |
| `@tsconfig/node18`                    |    `2.0.0` |        replace with `@tsconfig/node24@24.0.4` | runtime alignment    | https://github.com/tsconfig/bases                                 |
| `@types/archiver`                     |   `^8.0.0` |                                       `8.0.0` | same                 | https://github.com/DefinitelyTyped/DefinitelyTyped                |
| `@types/jsonwebtoken`                 |   `^9.0.0` |                                      `9.0.10` | patch                | https://github.com/DefinitelyTyped/DefinitelyTyped                |
| `@types/localtunnel`                  |   `^2.0.4` |                                 remove unused | remove               | https://github.com/DefinitelyTyped/DefinitelyTyped                |
| `@types/node`                         |  `^18.8.4` |                                      `26.1.0` | major                | https://github.com/DefinitelyTyped/DefinitelyTyped                |
| `@types/ramda`                        |  `^0.29.0` |                                      `0.32.0` | minor                | https://github.com/DefinitelyTyped/DefinitelyTyped                |
| `@types/react`                        | `^18.0.21` |                                     `19.2.17` | major                | https://github.com/DefinitelyTyped/DefinitelyTyped                |
| `@types/react-dom`                    |  `^18.0.6` |                                      `19.2.3` | major                | https://github.com/DefinitelyTyped/DefinitelyTyped                |
| `@types/uuid`                         |  `^10.0.0` |                                      `11.0.0` | major/remove         | npm deprecated metadata                                           |
| `@uidotdev/usehooks`                  |    `2.4.1` |                                       `2.4.1` | same                 | https://github.com/uidotdev/usehooks                              |
| `@uzh-bf/design-system`               |   `4.0.11` |                                       `4.1.6` | minor                | private npm metadata                                              |
| `archiver`                            |   `^8.0.0` |                                       `8.0.0` | same                 | https://github.com/archiverjs/node-archiver                       |
| `autoprefixer`                        |  `10.4.15` |                                      `10.5.2` | minor                | https://github.com/postcss/autoprefixer                           |
| `axios`                               |    `1.5.1` |                                      `1.18.1` | minor                | https://github.com/axios/axios                                    |
| `concurrently`                        |   `^9.2.0` |                                      `10.0.3` | major                | https://github.com/open-cli-tools/concurrently                    |
| `cross-fetch`                         |    `3.1.5` |                                       `4.1.0` | major                | https://github.com/lquixada/cross-fetch                           |
| `cssnano`                             |    `7.1.1` |                                       `8.0.2` | major                | https://github.com/cssnano/cssnano                                |
| `date-fns`                            |   `2.30.0` |                                       `4.4.0` | major                | https://github.com/date-fns/date-fns                              |
| `dayjs`                               | `^1.11.13` |                                     `1.11.21` | patch                | https://github.com/iamkun/dayjs                                   |
| `dotenv-cli`                          |    `7.3.0` |                                      `11.0.0` | major                | https://github.com/entropitor/dotenv-cli                          |
| `eslint`                              |   `8.48.0` |                                      `10.6.0` | major                | https://github.com/eslint/eslint                                  |
| `eslint-config-next`                  |  `13.4.19` |                                     `16.2.10` | major                | https://github.com/vercel/next.js                                 |
| `formik`                              |    `2.4.6` |                                       `2.4.9` | patch                | https://github.com/jaredpalmer/formik                             |
| `jsonwebtoken`                        |    `9.0.1` |                                       `9.0.3` | patch                | https://github.com/auth0/node-jsonwebtoken                        |
| `localforage`                         |   `1.10.0` |                                      `1.10.0` | same                 | https://github.com/localForage/localForage                        |
| `localtunnel`                         |   `^2.0.2` |                                 remove unused | remove               | https://github.com/localtunnel/localtunnel                        |
| `next`                                |   `15.3.4` |                                     `16.2.10` | major                | https://github.com/vercel/next.js                                 |
| `next-auth`                           |  `4.24.11` |                                     `4.24.14` | patch                | https://github.com/nextauthjs/next-auth                           |
| `nextjs-cors`                         |    `2.2.0` |                                       `2.2.1` | patch                | https://github.com/yonycalsin/nextjs-cors                         |
| `node-fetch`                          |    `3.3.2` |                                       `3.3.2` | same                 | https://github.com/node-fetch/node-fetch                          |
| `nodemailer`                          |    `6.9.4` |                              remove if unused | major/remove         | https://github.com/nodemailer/nodemailer                          |
| `npm-run-all`                         |    `4.1.5` |                                 remove unused | remove               | https://github.com/mysticatea/npm-run-all                         |
| `postcss`                             |   `8.4.47` |                                      `8.5.16` | minor                | https://github.com/postcss/postcss                                |
| `prettier`                            |    `3.6.2` |                                       `3.9.4` | minor                | https://github.com/prettier/prettier                              |
| `prettier-plugin-organize-imports`    |    `3.2.3` |                                       `4.3.0` | major                | https://github.com/simonhaenisch/prettier-plugin-organize-imports |
| `prettier-plugin-tailwindcss`         |  `~0.6.14` |                                       `0.8.0` | minor                | https://github.com/tailwindlabs/prettier-plugin-tailwindcss       |
| `prisma`                              |   `6.15.0` |                                       `7.8.0` | major                | https://github.com/prisma/prisma                                  |
| `ramda`                               |   `0.29.0` |                                      `0.32.0` | minor                | https://github.com/ramda/ramda                                    |
| `react`                               |   `19.1.1` |                                      `19.2.7` | minor                | https://github.com/facebook/react                                 |
| `react-dom`                           |   `19.1.1` |                                      `19.2.7` | minor                | https://github.com/facebook/react                                 |
| `react-dropzone`                      |   `14.2.3` |                                      `15.0.0` | major                | https://github.com/react-dropzone/react-dropzone                  |
| `react-hot-toast`                     |    `2.4.1` |                                       `2.6.0` | minor                | https://github.com/timolins/react-hot-toast                       |
| `standard-version`                    |    `9.5.0` |                                       `9.5.0` | same                 | https://github.com/conventional-changelog/standard-version        |
| `tailwind-merge`                      |    `3.3.1` |                                       `3.6.0` | minor                | https://github.com/dcastil/tailwind-merge                         |
| `tailwindcss`                         |  `~4.1.12` |                                       `4.3.2` | minor                | https://github.com/tailwindlabs/tailwindcss                       |
| `tailwindcss-animate`                 |   `~1.0.7` |                                       `1.0.7` | same                 | npm metadata                                                      |
| `tailwindcss-radix`                   |    `4.0.2` |                                       `4.0.2` | same                 | https://github.com/ecklf/tailwindcss-radix                        |
| `trpc-to-openapi`                     |   `^3.0.1` |                                       `3.3.0` | minor                | https://github.com/mcampa/trpc-to-openapi                         |
| `ts-node`                             |   `10.9.1` |                                      `10.9.2` | patch                | https://github.com/TypeStrong/ts-node                             |
| `ts-node-dev`                         |    `2.0.0` |                                       `2.0.0` | same                 | https://github.com/whitecolor/ts-node-dev                         |
| `tsx`                                 |  `^4.19.2` |                                      `4.23.0` | minor                | https://github.com/privatenumber/tsx                              |
| `tw-animate-css`                      |   `~1.3.4` |                                       `1.4.0` | minor                | https://github.com/Wombosvideo/tw-animate-css                     |
| `type-fest`                           |    `4.5.0` |                                       `5.7.0` | major                | https://github.com/sindresorhus/type-fest                         |
| `typescript`                          |    `5.9.2` |                                       `6.0.3` | major                | https://github.com/microsoft/TypeScript                           |
| `uuid`                                |  `^11.0.5` |                                      `14.0.1` | major                | https://github.com/uuidjs/uuid                                    |
| `xlsx`                                |  `^0.18.5` | remove; replace with `write-excel-file@4.1.1` | security replacement | https://github.com/SheetJS/sheetjs                                |
| `yup`                                 |    `1.6.1` |                                       `1.7.1` | minor                | https://github.com/jquense/yup                                    |
| `zod`                                 |   `^4.1.3` |                                       `4.4.3` | minor                | https://github.com/colinhacks/zod                                 |

## Local Auth Design

Use existing proven pattern from `/Users/rschlae/Git/gbl/derivatives-game`:

- Add `oidc` service with `ghcr.io/navikt/mock-oauth2-server:2.1.11`.
- Use fixed dev subject/email/name.
- Add custom NextAuth OIDC provider in dev when `LOCAL_OIDC_ISSUER` or equivalent env is set.
- Remove Auth0 from development path.
- Keep AzureAD provider if `AZURE_AD_CLIENT_ID` exists.
- Keep Auth0 production support only if deployment still needs it. If deployment values confirm AzureAD-only, remove Auth0 code/env after verification.

Open decision:

- Env names: prefer `LOCAL_OIDC_ISSUER`, `LOCAL_OIDC_CLIENT_ID`, `LOCAL_OIDC_CLIENT_SECRET` instead of reusing `AUTH0_*`; cleaner and avoids hidden prod/dev coupling.

## Local Blob Design

Use Azurite default dev account:

- Account: `devstoreaccount1`
- Endpoint: `http://127.0.0.1:10000/devstoreaccount1`
- Container: `uploads`
- Key: fixed Azurite dev key from Microsoft docs, safe for local test only.

Implementation shape:

- Add `azurite` service to `docker-compose.yml`.
- Add local env template values for Azurite.
- Add script `scripts/setup-azurite.ts` or similar using Azure Blob SDK to create `uploads`.
- Add shared storage config helper so SAS generation and browser upload use same endpoint/container model.
- Browser upload remains direct SAS upload.

## Verification Baseline

No existing E2E config found:

- No Playwright config.
- No Cypress config.
- No `test:e2e` script.
- No `agent-browser` config.

Plan:

- Add minimal Playwright dependency/config before dependency upgrades.
- Use `pnpm run test:e2e` as the required browser proof for minor/patch and major dependency slices.
- Keep `agent-browser` as supplementary manual evidence, not the primary dependency-upgrade gate.
- Because user requested dependency upgrades to latest, adding Playwright latest stable is acceptable for E2E.

Browser smoke coverage:

- Start PostgreSQL + Azurite + OIDC.
- Run Prisma setup/seed.
- Start Next dev server with local env.
- Visit home page.
- Sign in through OIDC mock.
- Verify session email and role/admin behavior.
- Upload PDF to Azurite from application/proposal flow.
- Verify blob exists in Azurite.
- Verify application export/download route still works for authorized supervisor/developer.

## Implementation Slices

### Slice 0: Plan + Baseline

Files:

- `project/2026-07-02-dependency-refresh-oidc-azurite-plan.md`

Do:

- Commit plan alone after user review.
- Run baseline checks before package edits.

Check:

- `pnpm install --frozen-lockfile`
- `pnpm run prisma:generate`
- `pnpm exec tsc --noEmit`
- `pnpm run build`
- Existing `pnpm run lint` likely fails later due old Next lint path; record baseline.

Commit:

- `docs(project): add dependency refresh plan`

### Slice 1: Local Services

Files:

- `docker-compose.yml`
- `.env.local.template`
- `scripts/setup-azurite.ts`
- maybe `README.md`

Do:

- Add PostgreSQL service for local Prisma/default app path.
- Add Azurite service.
- Add OIDC mock service.
- Add local setup script for Azurite container.
- Add `dev:local` command/path that does not require Doppler/ngrok and uses local PostgreSQL, OIDC, and Azurite env.
- Do not edit `.env.development`; use templates/docs/local env instead.

Check:

- `docker compose up -d postgres azurite oidc`
- setup script creates `uploads`.
- OIDC discovery endpoint responds.
- Azurite blob endpoint responds.
- `pnpm exec tsc --noEmit`

Commit:

- `chore(dev): add local oidc and azurite services`

### Slice 2: Stable Local Auth Swap

Files:

- `src/lib/authOptions.ts`
- `src/components/Header.tsx`
- `.env.local.template`
- docs if needed

Do:

- Add generic OIDC provider for dev.
- Remove Auth0 from default development path.
- Keep AzureAD provider.
- Update sign-in/sign-out labels/comments.

Check:

- `pnpm run prisma:generate`
- `pnpm exec tsc --noEmit`
- `pnpm run build`
- Browser sign-in through local OIDC.
- Session user persists with expected email.

Commit:

- `chore(auth): use local oidc for development`

### Slice 3: Azurite-Compatible Blob Upload

Files:

- `src/server/routers/_app.ts`
- `src/components/ApplicationForm.tsx`
- `src/components/ProposalPublishForm.tsx`
- new `src/lib/storage.ts` or `src/lib/blobStorage.ts`
- env templates

Do:

- Centralize storage endpoint/container config.
- Generate SAS for Azure and Azurite.
- Make browser upload URL work with local Azurite.
- Keep production Azure SAS behavior.

Check:

- Upload PDF through browser to Azurite.
- Verify blob appears in `uploads`.
- Verify app stores attachment names/links as before.
- `pnpm exec tsc --noEmit`

Commit:

- `chore(storage): support azurite blob uploads locally`

### Slice 3b: E2E Browser Harness

Files:

- `package.json`
- `pnpm-lock.yaml`
- `playwright.config.ts`
- E2E tests under the repo's chosen test folder

Do:

- Add minimal Playwright browser harness before dependency upgrades.
- Cover local OIDC sign-in and Azurite upload happy path.
- Use local PostgreSQL, OIDC, and Azurite services.

Check:

- `pnpm run test:e2e`

Commit:

- `test(e2e): add local auth and blob smoke test`

### Slice 4: Minor/Patch Dependency Upgrade

Files:

- `package.json`
- `pnpm-lock.yaml`

Do:

- Upgrade non-major package updates first.
- Exact-pin versions instead of caret/range drift where possible.
- Remove `@types/uuid` if `uuid` types cover code.

Check:

- `pnpm install`
- `pnpm run prisma:generate`
- `pnpm exec tsc --noEmit`
- `pnpm run build`
- `pnpm run test:e2e`

Commit:

- `build(deps): update minor and patch dependencies`

### Slice 5: Node and pnpm Runtime Upgrade

Files:

- `package.json`
- `pnpm-lock.yaml`
- `Dockerfile`
- `tsconfig.json` if required
- README/runtime notes if needed

Do:

- Upgrade Node/pnpm runtime pins across package metadata and Docker.
- Replace `@tsconfig/node18` with `@tsconfig/node24`.
- Add `packageManager`, `engines`, and possibly `devEngines.packageManager`.
- Keep app runtime on non-distroless Node 24 in this slice.

Check:

- `node -v` reports `v24.18.0` locally if Volta active.
- `pnpm -v` reports `11.9.0` locally if Volta/Corepack active.
- `pnpm exec tsc --noEmit`
- `pnpm run build`
- Docker build reaches Next build stage with Node 24/pnpm 11.
- Browser smoke.

Commit:

- `build(runtime): upgrade node and pnpm`

### Slice 5b: Framework Major Upgrade

Files:

- `package.json`
- `pnpm-lock.yaml`
- `eslint.config.mjs`
- remove `.eslintrc.json`
- `tsconfig.json`
- `next.config.js` if required

Do:

- Upgrade Next, React, React DOM, TypeScript, ESLint, Next ESLint config, React/Node types.
- Replace `next lint` script with ESLint CLI.
- Replace or migrate the Matomo webpack alias in `next.config.js` so Turbopack build can remain enabled.
- Keep Turbopack defaults; do not add `--webpack`.
- Fix compile/lint errors.

Check:

- `pnpm run lint`
- `pnpm exec tsc --noEmit`
- `pnpm run build`
- Browser smoke.

Commit:

- `build(deps): upgrade next and tooling`

### Slice 5c: React Compiler and Turbopack Adoption

Files:

- `package.json`
- `pnpm-lock.yaml`
- `next.config.js`
- `eslint.config.mjs` if compiler lint rules are adopted
- touched React components only if compiler errors require fixes

Do:

- Add `babel-plugin-react-compiler@1.0.0`.
- Enable `reactCompiler: true`.
- Keep `next dev` and `next build` on Turbopack defaults.
- Evaluate `turbopackRustReactCompiler`; adopt only if stable/docs/build all line up.
- Fix purity/rules-of-hooks issues surfaced by compiler.
- Use annotation mode only if full compilation blocks this branch; record exact compiler failures and deferred cleanup.

Check:

- `pnpm run lint`
- `pnpm exec tsc --noEmit`
- `pnpm run build`
- Browser smoke with auth, admin view, upload.
- Record whether compiler ran fully or needed annotation mode.

Commit:

- `build(next): enable react compiler and turbopack`

### Slice 6: Prisma 7 Upgrade

Files:

- `package.json`
- `pnpm-lock.yaml`
- `prisma/schema.prisma`
- `prisma/schema.mysql.prisma` if still generated
- `src/server/prisma.ts`
- `Dockerfile`
- `deploy/chart_new/templates/migration-job.yaml`
- `deploy/chart_new/values.yaml`
- staging deploy file: `deploy/stg_new/values.yaml`
- production deploy file: `deploy/prd_new/values.yaml`
- legacy `deploy/chart`, `deploy/stg`, and `deploy/prd` only if confirmed active

Do:

- Upgrade Prisma packages.
- Add adapter/client output changes required by Prisma 7.
- Keep migrations on the Argo `PreSync` hook path, like careers.
- Keep the current direct `prisma migrate deploy` hook working with Prisma 7 by matching the global Prisma CLI version and copying Prisma config into the runtime image.
- Defer package-script execution and app-runtime/global-Prisma removal to Slice 6b, where a migration-capable image/stage can be proven.
- Keep app DB behavior unchanged.
- Validate migrations remain untouched.

Check:

- `pnpm run prisma:generate`
- `pnpm run build`
- `helm template` confirms `argocd.argoproj.io/hook: PreSync`, delete policy, migration command, image, env, resources, and secret reference.
- Rendered staging and production values keep migrations on Argo sync.
- IBW production values are out of scope for this rollout.
- Run Prisma seed/setup against local DB.
- Browser smoke auth and blob upload.

Commit:

- `build(deps): upgrade prisma`

### Slice 6b: Debian Runtime Parity and Migration Image

Files:

- `Dockerfile`
- `deploy/chart_new/templates/migration-job.yaml`
- `deploy/chart_new/values.yaml`
- staging deploy file: `deploy/stg_new/values.yaml`
- production deploy file: `deploy/prd_new/values.yaml`

Do:

- Move from Alpine/musl assumptions toward Debian/glibc parity before distroless.
- Prove Prisma engines/native modules work under Debian Node 24.
- Prove the Argo migration hook can use a migration-capable image/stage without the app runtime carrying global Prisma.
- Keep app runtime non-distroless in this slice.

Check:

- Docker build succeeds.
- Container starts with `server.js`.
- Rendered Helm shows deployment image and migration image/command clearly.
- Migration command is proven locally or by rendered command plus available image contents.
- Browser smoke auth and blob upload.

Commit:

- `build(docker): prove debian runtime parity`

### Slice 7: Distroless Runtime Proof

Files:

- `Dockerfile`
- `deploy/chart_new/templates/deployment.yaml`
- `deploy/chart_new/templates/migration-job.yaml`
- `deploy/chart_new/values.yaml`
- staging deploy file: `deploy/stg_new/values.yaml`
- production deploy file: `deploy/prd_new/values.yaml`
- legacy `deploy/chart`, `deploy/stg`, and `deploy/prd` only if confirmed active
- GitHub Actions workflows if separate migration image/tag is needed

Do:

- Try app runner on `gcr.io/distroless/nodejs24-debian13:nonroot`.
- Build on the Debian parity/migration-image proof from Slice 6b.
- Keep production migrations on the Argo `PreSync` hook.
- Use a separate migration-capable image/stage if the distroless app image cannot run the migration package script.
- Add `migration.image.repository/tag/pullPolicy` Helm values only if the migration image diverges from the app image.
- If deploy image tags are immutable SHA/release tags, prefer `image.pullPolicy: IfNotPresent` or omit it instead of `Always`.
- Keep app nonroot.
- Avoid shell-dependent commands in runner.

Check:

- Docker build succeeds.
- Container starts with `server.js`.
- Health endpoint works.
- Rendered Helm shows the deployment uses the hardened app image and the migration hook uses a migration-capable image.
- IBW production values are out of scope for this rollout.
- Migration hook command is proven locally or with rendered Helm command.
- Browser smoke still passes.

Commit:

- `build(docker): harden runtime image`

### Slice 8: Remaining Major Packages

Files:

- `package.json`
- `pnpm-lock.yaml`
- touched code from compile/runtime fixes

Do:

- Before upgrading, review official changelog/release notes for every remaining major package in this slice.
- Record accepted migration actions and notable new features in this plan before changing versions.
- Upgrade FontAwesome, Azure identity, date-fns, dotenv-cli, concurrently, cssnano, react-dropzone, type-fest, uuid, cross-fetch, prettier plugin.
- Remove `nodemailer` if usage search confirms EmailProvider remains disabled/commented.
- Fix surfaced API/type issues only.

Check:

- `pnpm run format`
- `pnpm run lint`
- `pnpm exec tsc --noEmit`
- `pnpm run build`
- `pnpm run test:e2e`

Commit:

- `build(deps): upgrade remaining major dependencies`

### Slice 9: Final E2E Evidence Refresh

Files:

- `package.json`
- `pnpm-lock.yaml`
- `playwright.config.ts` and tests
- plan progress
- screenshots/evidence if browser UI changes are visible

Do:

- Refresh the E2E harness after all dependency/runtime slices.
- Include auth and blob upload happy path.
- Capture final browser evidence for MR/PR if UI or auth behavior changed.

Check:

- `pnpm run test:e2e`

Commit:

- `test(e2e): refresh dependency upgrade smoke coverage`

### Slice 10: Final Review + Docs

Files:

- `README.md`
- plan progress
- maybe PR body later

Do:

- Update local dev docs.
- Record NextAuth v5 decision.
- Record distroless decision/evidence.
- Record React Compiler/Turbopack adoption status.
- Record dependency upgrade evidence.
- Run final security/quality review before PR.

Check:

- Fresh install/build.
- Fresh local browser smoke.
- Docker build if package/Dockerfile changed materially.

Commit:

- `docs(dev): document local oidc and azurite workflow`

## Skill Application Audit

Applied `rs-dependency-upgrade-planner` on 2026-07-03.

- Template fit: goal, non-goals, plan identity, research summary, runtime findings, major findings, minor/patch findings, full inventory, local dev design, verification baseline, slices, progress, open questions, and next steps are present.
- Checklist fit: dependency inventory, major upgrade research, runtime/package-manager surfaces, GitOps migration pattern, distroless feasibility, local OIDC, Azurite, browser verification, and PR/MR review gates are covered.
- Gap fixed during audit: added hidden GitHub Actions Docker workflows, absent runtime config files, and legacy deploy surface verification.
- Deployment sequencing decision: deploy to staging, test there, then promote to production. `_new` is only the current deploy file suffix, not a separate environment or rollout lane.
- Remaining gap: confirm whether legacy `deploy/chart`, `deploy/stg`, and `deploy/prd` are still active. If yes, include them in Node, image, migration, and distroless changes.

## Independent Plan Review

Reviewer: subagent `Ohm` using `df-sliced-development-workflow`.

Status: `DONE_WITH_CONCERNS`.

Accepted fixes:

- PostgreSQL local service replaces mistaken MySQL local smoke path.
- E2E browser harness moves before dependency upgrades.
- Remaining major packages require changelog/release-note review before upgrade.
- Base refreshed to `origin/main` at `b65cd32`.
- Local OIDC path must include `dev:local` without Doppler/ngrok.
- `pnpm exec tsc --noEmit` added to baseline and early slices because Next build ignores TypeScript errors.
- Distroless split into Debian parity/migration-image proof before distroless switch.
- `.env.development` must stay untouched; use templates/docs/local env.
- React Compiler full-mode go/no-go criteria added.
- `image.pullPolicy` review added for immutable deploy tags.
- Matomo webpack alias from refreshed `origin/main` added as Turbopack adoption risk.

## Baseline Verification

Ran on 2026-07-04 after plan commit `6072919`.

Environment: Node `v22.18.0`; shell `pnpm` `11.7.0`; repo Volta pin `pnpm@10.15.0`.

Results:

- `pnpm install --frozen-lockfile` with shell `pnpm@11.7.0`: failed with `ERR_PNPM_IGNORED_BUILDS`.
- `CI=true npx -y pnpm@10.15.0 install --frozen-lockfile`: passed, with ignored-build warnings for Prisma/Tailwind/esbuild/sharp packages.
- `CI=true npx -y pnpm@10.15.0 run prisma:generate`: passed.
- `CI=true npx -y pnpm@10.15.0 run lint`: passed.
- `CI=true npx -y pnpm@10.15.0 run build`: passed; Next type check skipped because `next.config.js` sets `typescript.ignoreBuildErrors: true`.
- `CI=true npx -y pnpm@10.15.0 exec tsc --noEmit`: initially failed on Prisma generated-client typing/export resolution and follow-on strict TypeScript errors.
- After restoring `node_modules` with `CI=true npx -y pnpm@10.15.0 install --frozen-lockfile` and rerunning `prisma:generate`, Slice 1 reran `CI=true npx -y pnpm@10.15.0 exec tsc --noEmit` successfully.

Decision:

- Slices must run slice-specific checks and include build/lint/`tsc` evidence where relevant.
- Treat `tsc` as an active gate from Slice 1 onward; a new failure blocks the slice unless it is explicitly isolated to a planned major-upgrade breakage.
- pnpm 11 slice must handle build approvals and avoid `pnpm-workspace.yaml` / `.pnpm-store` churn.

## Progress

- [x] Branch created: `codex/dependency-refresh-oidc-azurite`
- [x] Branch fast-forwarded to `origin/main` at `b65cd32`.
- [x] Direct package registry research completed for 79 packages.
- [x] Major framework/auth/storage docs checked.
- [x] Node 24, pnpm 11, distroless, React Compiler, and Turbopack docs checked.
- [x] Existing OIDC mock pattern found in `derivatives-game`.
- [x] Existing blob upload/SAS path inspected.
- [x] Careers Argo migration pattern inspected and added as target deployment model.
- [x] `rs-dependency-upgrade-planner` applied to this thesis plan.
- [x] Independent plan review completed and accepted findings integrated.
- [x] Plan written.
- [x] Plan committed alone: `6072919 docs(project): add dependency refresh plan`.
- [x] Baseline verification completed.
- [x] Slice 1 local services implemented: PostgreSQL, Azurite, OIDC mock, `dev:local`, template env, and setup docs.
- [x] Slice 1 review completed by subagent `Sagan`; accepted findings integrated.
- [x] Slice 1 simplification completed by subagent `Hubble`; accepted reductions integrated.
- [x] Slice 1 verification passed:
  - `docker compose config`
  - `docker compose up -d postgres azurite oidc`
  - `docker compose exec -T postgres pg_isready -U thesis -d thesis`
  - `curl -fsS http://localhost:4011/default/.well-known/openid-configuration`
  - Azurite SDK setup/readback for `uploads`
  - `CI=true npx -y pnpm@10.15.0 exec dotenv -e .env.local.template -- prisma db push`
  - `CI=true npx -y pnpm@10.15.0 exec dotenv -e .env.local.template -- ts-node --project tsconfig.tsnode.json prisma/seed-df.ts`
  - `CI=true npx -y pnpm@10.15.0 run lint`
  - `CI=true npx -y pnpm@10.15.0 exec tsc --noEmit`
- [x] Slice 2 local OIDC provider wiring implemented.
- [x] Slice 2 review completed by subagent `Poincare`; accepted finding integrated.
- [x] Slice 2 simplification completed by subagent `Chandrasekhar`; accepted reductions integrated.
- [x] Slice 2 verification passed:
  - `CI=true npx -y pnpm@10.15.0 exec prettier --check src/lib/authOptions.ts src/types/app.ts src/components/Header.tsx README.md`
  - `CI=true npx -y pnpm@10.15.0 run lint`
  - `CI=true npx -y pnpm@10.15.0 exec tsc --noEmit`
  - `NEXTAUTH_URL=http://localhost:3100 NEXT_PUBLIC_APP_URL=localhost:3100 CI=true npx -y pnpm@10.15.0 exec dotenv -e .env.local.template -- next dev -p 3100`
  - `curl -fsS http://localhost:3100/api/auth/providers` returned only `local-oidc`
  - Full CSRF sign-in through `local-oidc` returned session for `admin@example.com` with `role: DEVELOPER`, `adminRole: ADMIN`, `isAdmin: true`
- [x] Slice 3 Azurite-compatible browser upload implemented.
- [x] Slice 3 review completed by subagent `Kant`; accepted findings integrated:
  - staged/committed helper must include new `src/lib/blobUpload.ts`
  - browser-origin upload needed stronger evidence than Node SDK upload
  - plan progress needed final evidence before commit
- [x] Slice 3 simplification completed by subagent `Sartre`; accepted reductions integrated:
  - client upload contract now uses `sasString`, `serviceUrl`, `containerName`
  - upload helper return type/input surface trimmed to browser `Blob` use
  - server normalizes accidental container suffixes out of the configured blob service URL
- [x] Slice 3 verification passed:
  - `CI=true npx -y pnpm@10.15.0 exec dotenv -e .env.local.template -- tsx scripts/setup-azurite.ts`
  - browser-context upload from `http://localhost:3100` to Azurite returned HTTP `201` for `slice3-browser-1783150037551.pdf`
  - account-credential readback confirmed `slice3-browser-1783150037551.pdf` exists in container `uploads`
  - `CI=true npx -y pnpm@10.15.0 run lint`
  - `CI=true npx -y pnpm@10.15.0 exec tsc --noEmit`
  - `CI=true npx -y pnpm@10.15.0 run build`
- [ ] Browser UI limitation found during Slice 3: `next dev` hydrates incorrectly in `agent-browser`; body remains hidden by Next FOUC CSS and console shows Next dev HMR `Cannot read properties of undefined (reading 'components')`. Browser-origin upload is proven, but full Dropzone UI automation should be revisited in Slice 3b/E2E harness.
- [x] Slice 3b E2E browser harness implemented.
- [x] Slice 3b review completed by subagent `Planck`; accepted findings integrated:
  - setup now waits for Docker services plus PostgreSQL, Azurite, and OIDC readiness
  - Playwright test process now runs under `.env.local.template`
  - SAS response shape is checked before browser upload
- [x] Slice 3b simplification completed by subagent `Archimedes`; accepted reductions integrated:
  - removed premature `E2E_BASE_URL` and redundant Playwright config
  - test name now reflects SAS/browser PUT proof instead of full Dropzone coverage
  - Azurite readback now fails fast on missing local env instead of duplicating defaults
- [x] Slice 3b verification passed:
  - `CI=true npx -y pnpm@10.15.0 run test:e2e`: 1 Chromium test passed; local OIDC session, browser-origin SAS upload to Azurite, and account-credential blob readback
  - `CI=true npx -y pnpm@10.15.0 run lint`
  - `CI=true npx -y pnpm@10.15.0 exec tsc --noEmit`
  - `CI=true npx -y pnpm@10.15.0 exec prettier --check package.json playwright.config.ts scripts/setup-e2e.ts tests/e2e/local-auth-blob.spec.ts`
  - `CI=true npx -y pnpm@10.15.0 run build`
- [x] Slice 4 minor/patch dependency upgrade implemented:
  - Runtime same-major updates applied first with pinned `pnpm@10.15.0`.
  - `next-auth@4.24.14` peer warning for `nodemailer@^7.0.7` checked against package metadata; `nodemailer` is optional and remains deferred to the planned major-upgrade slice because the app does not enable the email provider.
  - `trpc-to-openapi@3.3.0` peer warning for `zod-openapi@^5.4.4` settled by adding exact `zod-openapi@5.4.4`; `zod-openapi@6` remains a major deferral.
  - `@uzh-bf/design-system@4.1.6` required TypeScript `moduleResolution: "bundler"` for export-map type resolution and Next `transpilePackages` because its development export resolves to source `.tsx`.
  - `@azure/storage-blob@12.33.0` required local Azurite `--skipApiVersionCheck` because SDK API version `2026-06-06` is newer than Azurite `3.35.0`.
  - Final outdated check shows only deferred major upgrades and deprecated `@types/uuid`, which remains deferred because `uuid@11.1.0` has no bundled declarations.
- [x] Slice 4 review completed by subagent `Bernoulli`; accepted finding integrated:
  - added E2E OpenAPI `/api/healthcheck` smoke for the upgraded `trpc-to-openapi` and `zod-openapi` path.
- [x] Slice 4 simplification completed by subagent `Gibbs`; accepted findings integrated:
  - reverted formatting-only Markdown table churn in the plan.
  - corrected stale plan reference from `tsx@4.22.5` to `tsx@4.23.0`.
- [x] Slice 4 verification passed:
  - `CI=true npx -y pnpm@10.15.0 install --frozen-lockfile`
  - `CI=true npx -y pnpm@10.15.0 run prisma:generate`
  - `CI=true npx -y pnpm@10.15.0 run lint`
  - `CI=true npx -y pnpm@10.15.0 exec tsc --noEmit`
  - `CI=true npx -y pnpm@10.15.0 exec prettier --check tests/e2e/local-auth-blob.spec.ts package.json tsconfig.json next.config.js docker-compose.yml`
  - `CI=true npx -y pnpm@10.15.0 run build`
  - `CI=true npx -y pnpm@10.15.0 run test:e2e`: 1 Chromium test passed with local PostgreSQL, OIDC, Azurite setup, OpenAPI healthcheck, sign-in, SAS minting, browser upload, and blob readback.
- [x] Slice 5 Node and pnpm runtime upgrade implemented:
  - Live version refresh on 2026-07-04 confirmed Node `v24.18.0` is latest Node 24 LTS (`Krypton`), `pnpm@11.9.0` is current latest, and `@tsconfig/node24@24.0.4` is current.
  - Scope: package metadata, lockfile, TypeScript base config, Docker Node/pnpm pins, and runtime docs only.
  - Keep app runtime non-distroless in this slice.
  - pnpm 11 docs checked through Context7: default `minimumReleaseAge` is `1440` minutes; pnpm 11 settings belong in `pnpm-workspace.yaml`; omitting `packages` keeps this single root package in scope.
  - First pnpm 11 lockfile attempt blocked `tsx@4.23.0` and transitive `electron-to-chromium@1.5.387` as too new for the default release-age cooldown. Registry metadata and integrity were checked; add exact `minimumReleaseAgeExclude` entries while keeping the global cooldown enabled.
  - First pnpm 11 frozen install recreated `node_modules` but failed on unapproved build scripts. pnpm 11 docs checked: use `allowBuilds` in `pnpm-workspace.yaml`, not deprecated `onlyBuiltDependencies`; allow only `@prisma/client`, `@prisma/engines`, `esbuild`, `prisma`, `sharp`, and `unrs-resolver`.
  - Slice reviews found the Node type surface still pinned to Node 18. Align direct `@types/node` to latest Node 24 line, `24.13.2`, rather than jumping to Node 26 types.
- [x] Slice 5 review completed by subagent `Halley`; accepted findings integrated:
  - include newly required `pnpm-workspace.yaml` in the commit because Docker copies it before install.
  - align `@types/node` to the Node 24 type line.
  - add Docker platform proof for both workflow surfaces: default `linux/amd64` and explicit `linux/arm64`.
- [x] Slice 5 simplification completed by subagent `Singer`; accepted findings integrated:
  - change README runtime wording from `Node.js 24.18.x` to `Node.js 24.x` while keeping exact pins in package metadata and Docker.
  - keep duplicated `packageManager` and Volta pins because they serve Corepack and Volta users separately.
  - keep pnpm 11 lockfile metadata churn; it is generated by the final pnpm install.
- [x] Slice 5 verification passed:
  - `node -v`: `v24.18.0`
  - `CI=true npx -y pnpm@11.9.0 -v`: `11.9.0`
  - `CI=true npx -y pnpm@11.9.0 install --lockfile-only`
  - `CI=true npx -y pnpm@11.9.0 install --frozen-lockfile`
  - `CI=true npx -y pnpm@11.9.0 exec prettier --check package.json pnpm-workspace.yaml tsconfig.json README.md`
  - `CI=true npx -y pnpm@11.9.0 run lint`
  - `CI=true npx -y pnpm@11.9.0 exec tsc --noEmit`
  - `CI=true npx -y pnpm@11.9.0 run build`
  - `CI=true npx -y pnpm@11.9.0 run test:e2e`: 1 Chromium test passed with local PostgreSQL, OIDC, Azurite setup, OpenAPI healthcheck, sign-in, SAS minting, browser upload, and blob readback.
  - `docker build -t thesis-platform:node24-pnpm11-smoke .`: passed for `linux/arm64`.
  - `docker buildx build --platform linux/amd64 -t thesis-platform:node24-pnpm11-amd64-smoke --load .`: passed for the GitHub Actions default platform.
  - Docker runner stage still warns on existing global `npm install -g prisma@6.15.0`; leave for the planned migration/Prisma slice where the hook should move to the app package script or a migration-capable image.
- [x] Slice 5b framework major upgrade implemented:
  - Current package targets checked on 2026-07-04: `next@16.2.10`, `eslint-config-next@16.2.10`, `typescript@6.0.3`, `@types/react@19.2.17`, `@types/react-dom@19.2.3`; `react` and `react-dom` are already latest at `19.2.7`.
  - ESLint 10.6.0 was checked but deferred: `eslint-config-next@16.2.10` still pulls current `eslint-plugin-import`, `eslint-plugin-react`, and `eslint-plugin-jsx-a11y` versions whose peer ranges stop at ESLint 9. Use latest compatible `eslint@9.39.4`.
  - Next 16 docs checked through Context7: Turbopack is default for `next dev` and `next build`; `next lint` is removed and should migrate to ESLint CLI; aliases belong under `turbopack.resolveAlias`.
  - ESLint 10 docs checked through Context7: use flat config and the migration tool/codemod as the starting point. The slice uses `eslint-config-next/core-web-vitals` without `eslint-config-next/typescript` to preserve the old `.eslintrc.json` lint surface.
  - `@next/codemod@canary next-lint-to-eslint-cli --force .` was used as the starting point; manually kept the flat config scoped to current behavior.
  - New React Hooks plugin compiler-readiness rules `react-hooks/purity`, `react-hooks/set-state-in-effect`, and `react-hooks/preserve-manual-memoization` are disabled for now. They fail on existing component patterns and belong in Slice 5c React Compiler adoption, not the framework compatibility slice.
  - TypeScript 6 failed on inherited `target=ES5` and `baseUrl`. Replace app `baseUrl` with explicit `src/*` paths and override target to `ES2020`.
  - `ts-node` seed/reset config failed under TypeScript 6 with TS5011 and legacy `moduleResolution=node10` deprecation. Add explicit `rootDir` and temporary `ignoreDeprecations: "6.0"` there only; leave a full script-runner cleanup for the migration/Prisma slice.
  - Turbopack initially warned that `styled-jsx/style.js` could not resolve under pnpm strict layout. Add exact direct `styled-jsx@5.1.6`, deduped with Next 16's own dependency at the time, to remove the production-build warning.
  - Webpack alias for DF Matomo tracking moved to `turbopack.resolveAlias`. Reviewer found absolute alias targets fail under Turbopack; use a project-relative alias target and verify the DF webstats branch explicitly.
- [x] Slice 5b review completed by subagent `Epicurus`; accepted findings integrated:
  - run a Matomo-enabled build for the gated `ENABLE_DF_WEBSTATS=true` alias branch.
  - fix the Turbopack alias target from an absolute filesystem path to `./analytics/MatomoTracking.tsx`.
  - record the temporary React Hooks rule disables as React Compiler follow-up scope.
- [x] Slice 5b simplification completed by subagent `Averroes`; accepted findings integrated or explicitly deferred:
  - keep TS config changes because they map directly to observed TypeScript 6 failures.
  - keep exact `styled-jsx@5.1.6` in Slice 5b because it removes an observed Turbopack warning and dedupes to Next's pinned transitive version at that point.
  - keep React Hooks compiler-readiness rule disables only as a temporary Slice 5c follow-up.
- [x] Slice 5b verification passed:
  - `CI=true npx -y pnpm@11.9.0 install --frozen-lockfile`
  - `CI=true npx -y pnpm@11.9.0 run lint`
  - `CI=true npx -y pnpm@11.9.0 exec tsc --noEmit`
  - `CI=true npx -y pnpm@11.9.0 run build`: Next `16.2.10` production build uses Turbopack.
  - `NEXT_PUBLIC_DEPARTMENT_NAME=DF ENABLE_DF_WEBSTATS=true CI=true npx -y pnpm@11.9.0 run build`: Matomo alias branch passed.
  - `CI=true npx -y pnpm@11.9.0 run test:e2e`: 1 Chromium test passed with local PostgreSQL, OIDC, Azurite setup, OpenAPI healthcheck, sign-in, SAS minting, browser upload, and blob readback under Next 16 dev/Turbopack.
  - `docker build -t thesis-platform:next16-smoke .`: passed; Docker runner stage still warns on existing global `npm install -g prisma@6.15.0`, left for migration/Prisma slice.
- [x] Slice 5c React Compiler and Turbopack adoption implemented:
  - Next 16 docs checked through Context7: install `babel-plugin-react-compiler`, set `reactCompiler: true`, and use annotation mode only if full compilation blocks the branch.
  - React docs checked through Context7: compiler diagnostics skip unsupported components by default with `panicThreshold: "none"`; not every compiler lint must be fixed immediately.
  - Registry metadata checked on 2026-07-04: `babel-plugin-react-compiler@1.0.0` is latest stable; `eslint-plugin-react-hooks@7.1.1` supports ESLint 9 and 10.
  - Full compiler mode is enabled through `reactCompiler: true`; annotation mode and undocumented Turbopack Rust compiler flags were not used because the stable documented path passes.
  - React Compiler errors fixed before adopting full mode:
    - `ApplicationForm` moved the default start date into a lazy state initializer to avoid render-time date impurity.
    - `AdminStatsDashboard` now uses the stable query result object in the year-items memo dependency.
    - `AdminStatsDashboard`, `AdminUserRoles`, and `AdminInfoOverview` moved pagination resets from synchronous effects into user-event handlers where practical.
  - `react-hooks/set-state-in-effect` remains a warning, not an error, for 7 existing URL/localStorage/modal synchronization effects. React Compiler skips unsupported components by default and builds passed, so this is cleanup scope instead of a blocker.
- [x] Slice 5c verification passed:
  - `CI=true npx -y pnpm@11.9.0 install --frozen-lockfile`
  - `CI=true npx -y pnpm@11.9.0 run lint`: passed with 7 `react-hooks/set-state-in-effect` warnings and 0 errors.
  - `CI=true npx -y pnpm@11.9.0 exec tsc --noEmit`
  - `CI=true npx -y pnpm@11.9.0 run build`: Next `16.2.10` production build passed with Turbopack and React Compiler.
  - `NEXT_PUBLIC_DEPARTMENT_NAME=DF ENABLE_DF_WEBSTATS=true CI=true npx -y pnpm@11.9.0 run build`: Matomo alias branch passed with React Compiler.
  - `CI=true npx -y pnpm@11.9.0 run test:e2e`: 1 Chromium test passed with local PostgreSQL, OIDC, Azurite setup, sign-in, SAS minting, browser upload, and blob readback; dev server still prints an existing styled-jsx hydration warning.
  - `docker build -t thesis-platform:react-compiler-smoke .`: passed; Docker runner stage still warns on existing global `npm install -g prisma@6.15.0`, left for migration/Prisma slice.
- [x] Slice 5c review completed by subagent `Fermat`; no critical or important findings:
  - accepted: AdminInfo pagination now displays `effectiveCurrentPage` when the real state is clamped for filtered data.
  - accepted: kept functional updater pagination handlers to avoid rapid-click stale state.
  - deferred: data-driven professor sanitization can change selected IDs without resetting to page 1, but `effectiveCurrentPage` prevents an empty table and adding another synchronous effect update would increase the warning surface.
  - noted: current E2E smoke covers auth/blob, not admin pagination; lint, typecheck, build, and existing E2E are sufficient for this compiler-adoption slice.
- [x] Slice 5c simplification completed by subagent `Erdos`:
  - accepted: removed answered React Compiler Rust-vs-stable open question from the plan.
  - accepted: remaining diff is scoped to compiler config, compiler dependency, lint posture, and required component fixes.
  - deferred: no extra simplification beyond keeping the functional updater pagination handlers after review.
- [x] Slice 5c post-review verification passed:
  - `git diff --check`
  - `CI=true npx -y pnpm@11.9.0 run lint`: passed with the same 7 `react-hooks/set-state-in-effect` warnings and 0 errors.
  - `CI=true npx -y pnpm@11.9.0 exec tsc --noEmit`
  - `CI=true npx -y pnpm@11.9.0 run build`
  - `NEXT_PUBLIC_DEPARTMENT_NAME=DF ENABLE_DF_WEBSTATS=true CI=true npx -y pnpm@11.9.0 run build`
  - `CI=true npx -y pnpm@11.9.0 run test:e2e`: 1 Chromium test passed; existing styled-jsx hydration warning still appears.
  - `docker build -t thesis-platform:react-compiler-smoke .`: passed on Node `24.18.0`; existing global Prisma npm warning remains migration/Prisma slice scope.
- [x] Slice 6 Prisma 7 and Argo migration compatibility completed:
  - Registry metadata checked on 2026-07-04: `prisma@7.8.0`, `@prisma/client@7.8.0`, `@prisma/adapter-pg@7.8.0`, `@prisma/adapter-mariadb@7.8.0`, and `@prisma/client-runtime-utils@7.8.0` are current latest versions; `@prisma/adapter-pg@7.8.0` brings `pg@8.22.0` transitively.
  - Context7 Prisma 7 docs refreshed: `datasource.url` moves from schema to `prisma.config.ts`; PostgreSQL runtime access needs a driver adapter; MariaDB/MySQL access uses `@prisma/adapter-mariadb`; legacy `prisma-client-js` remains available and preserves `@prisma/client` imports.
  - Minimal Prisma 7 path selected: keep `prisma-client-js` and existing imports, add `prisma.config.ts`, add PostgreSQL adapter wiring, and keep migrations unchanged.
  - `prisma generate` initially failed with P1012 on `datasource.url`; accepted fix moves URLs to config files and adds a build-time placeholder only for generate scripts.
  - `prisma:generate:mysql` preserved with `prisma.mysql.config.ts`; review found the archived MySQL migration client also needs `@prisma/adapter-mariadb` and direct `@prisma/client-runtime-utils` under pnpm, so the script now uses a MariaDB adapter instead of removed `datasources` constructor overrides.
  - `build:next` now provides the same placeholder PostgreSQL URL only during `next build`, so runtime/start remains strict while build-time module evaluation does not need a real database secret.
  - Argo migration hook remains `PreSync` and direct `prisma migrate deploy` in this slice because the current final Next standalone image does not carry pnpm/local Prisma CLI reliably. Dockerfile now installs matching global `prisma@7.8.0` and copies `prisma.config.ts`; package-script/migration-capable-image split stays in Slice 6b.
  - `helm template thesis-platform deploy/chart_new -f deploy/stg_new/values.yaml` and `-f deploy/prd_new/values.yaml` render the migration Job with `argocd.argoproj.io/hook: PreSync`, delete policy, app image, direct Prisma command, env secret, and resources.
  - Slice 6 review findings accepted:
    - dropped redundant direct `pg` dependency because `@prisma/adapter-pg` owns it.
    - dropped unused `prisma:deploy:k8s` script because the hook still uses direct global Prisma in this slice.
    - deferred existing `imagePullPolicy: Always` on commit-like tags to Slice 6b/deploy hardening with the migration-image work.
    - accepted missing app-container DB smoke and live Argo sync as residual risks until a real environment rollout.
  - Slice 6 post-review verification passed:
    - `CI=true npx -y pnpm@11.9.0 install --frozen-lockfile`
    - `CI=true npx -y pnpm@11.9.0 run prisma:generate:mysql`
    - MySQL archived-client constructor smoke with `@prisma/adapter-mariadb`: passed with plain Node.
    - `CI=true npx -y pnpm@11.9.0 run lint`: passed with the same 7 `react-hooks/set-state-in-effect` warnings and 0 errors.
    - `CI=true npx -y pnpm@11.9.0 exec tsc --noEmit`
    - `CI=true npx -y pnpm@11.9.0 run build`
    - `NEXT_PUBLIC_DEPARTMENT_NAME=DF ENABLE_DF_WEBSTATS=true CI=true npx -y pnpm@11.9.0 run build`
    - `CI=true npx -y pnpm@11.9.0 run test:e2e`: 1 Chromium test passed with local PostgreSQL, OIDC, Azurite setup, sign-in, SAS minting, browser upload, and blob readback; existing styled-jsx hydration and LCP warnings still appear.
    - `helm template thesis-platform deploy/chart_new -f deploy/stg_new/values.yaml` and `-f deploy/prd_new/values.yaml`: rendered PreSync migration Job, direct Prisma command, app image, env secret, and resources for staging and production.
    - `docker build -t thesis-platform:prisma7-smoke .`: passed on Node `24.18.0`; global Prisma npm allow-scripts warning remains known until Slice 6b removes migration tooling from the app runtime image.
    - `docker run --rm --network thesis-platform_thesis-platform -e DATABASE_URL='postgresql://thesis:thesis@postgres:5432/thesis_migrate_smoke_20260704_1308?sslmode=disable' thesis-platform:prisma7-smoke prisma migrate deploy`: applied baseline migration successfully on a fresh throwaway DB.
- [x] Slice 6b Debian runtime parity and migration-image proof completed:
  - Scope expanded to GitHub Actions because a Helm migration image override is not useful unless CI builds and tags that target.
  - Dockerfile now uses Debian `node:24.18.0-bookworm-slim` for dependency, build, app, and migration stages.
  - App runner no longer carries global Prisma, `node_modules/.bin/prisma`, `prisma.config.ts`, or `prisma/`; default Docker build resolves to the app runner through `FROM runner AS app`.
  - Added `migration-runner` target with local Prisma CLI, `node_modules`, `prisma.config.ts`, schema, and migrations.
  - Helm migration job now supports `migration.image.repository/tag/pullPolicy`; it falls back to the app image and direct `prisma migrate deploy` command when no migration tag is configured.
  - Staging and production ARM image workflows now build and publish migration image tags next to app image tags and update `deploy/stg_new/values.yaml` / `deploy/prd_new/values.yaml` only. IBW values remain untouched for this staged rollout.
  - Staging and production app image pull policies changed to `IfNotPresent` for immutable SHA/release-like tags.
- [x] Slice 6b review completed by subagent `Locke`; accepted findings integrated:
  - migration target now copies Prisma files directly from the build context instead of the `builder` stage, so building the migration image does not require a full Next build or app build args.
  - workflow tag update logic now handles existing `migration.image` blocks, optional repositories, missing migration tags, and verifies replacements.
- [x] Slice 6b simplification completed by subagent `Pasteur`; accepted findings integrated:
  - migration job omits `command` when a migration image tag is configured and lets the migration image `CMD` run.
  - workflow-generated values append only the migration tag; chart defaults pull policy to the app pull policy.
  - migration runtime copies only `node_modules`, `prisma.config.ts`, and `prisma/`, not package metadata or lockfiles.
- [x] Slice 6b verification passed:
  - `git diff --check`
  - `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/docker-image-stg-arm.yml'); YAML.load_file('.github/workflows/docker-image-prd.yml'); puts 'yaml ok'"`
  - `helm template thesis-platform deploy/chart_new -f deploy/stg_new/values.yaml`: rendered app image fallback, `IfNotPresent`, PreSync hook, and fallback direct Prisma command.
  - `helm template thesis-platform deploy/chart_new -f deploy/stg_new/values.yaml --set migration.image.tag=migration-latest-arm-test --set migration.image.pullPolicy=IfNotPresent`: rendered migration image, PreSync hook, and no overridden command.
  - `helm template thesis-platform deploy/chart_new -f deploy/prd_new/values.yaml`: rendered app image fallback, `IfNotPresent`, PreSync hook, and fallback direct Prisma command.
  - `helm template thesis-platform deploy/chart_new -f deploy/prd_new/values.yaml --set migration.image.tag=migration-stable-arm-test --set migration.image.pullPolicy=IfNotPresent`: rendered migration image, PreSync hook, and no overridden command.
  - `docker build -t thesis-platform:debian-smoke .`: app image built from Debian Node 24 without global Prisma tooling.
  - `docker run --rm thesis-platform:debian-smoke sh -c 'test -f /app/server.js && test ! -e /app/node_modules/.bin/prisma && test ! -e /app/prisma && echo app-runner-ok'`: confirmed app runner contents.
  - `docker build --target migration-runner -t thesis-platform:migration-smoke .`: migration target built without running the Next builder stage.
  - `docker run --rm --network thesis-platform_thesis-platform -e DATABASE_URL='postgresql://thesis:thesis@postgres:5432/thesis_migration_runner_smoke_20260704_continue?sslmode=disable' thesis-platform:migration-smoke`: applied baseline migration successfully on a fresh throwaway DB.
  - `docker run` app server smoke on `thesis-platform:debian-smoke`: Next server started and returned HTTP `404` for `/404` inside the Docker network.
  - `CI=true npx -y pnpm@11.9.0 run test:e2e`: 1 Chromium test passed with local PostgreSQL, OIDC, Azurite setup, sign-in, SAS minting, browser upload, and blob readback; existing styled-jsx hydration and LCP warnings still appear.
- [x] Slice 7 distroless runtime proof completed:
  - `docker manifest inspect gcr.io/distroless/nodejs24-debian13:nonroot`: image exists for `linux/amd64` and `linux/arm64`.
  - Default app runner now uses `gcr.io/distroless/nodejs24-debian13:nonroot` with distroless Node entrypoint, `CMD ["server.js"]`, UID `65532`, and no shell/user creation step.
  - `base`, `deps`, `builder`, and `migration-runner` stay on Debian slim because they need package-manager, shell, and Prisma tooling.
  - Helm adds `image.runtime`; current fallback remains allowed for `node` runtime, but `image.runtime=distroless` fails unless `migration.image.tag` is set.
  - Staging and production image-tag workflows set app tag, `runtime: distroless`, and migration image tag together. Temp-copy workflow proof produced `latest-arm-deadbeef distroless migration-latest-arm-deadbeef` for staging and `stable-arm-deadbeef distroless migration-stable-arm-deadbeef` for production.
  - IBW production values remain unchanged for the staged rollout. Existing IBW image workflows now build `target: node-runner`, a Debian app target with local Prisma CLI on `PATH`, so the current IBW app-image migration fallback remains compatible until IBW gets the same separate migration-image rollout.
- [x] Slice 7 review completed by subagent `Heisenberg`; accepted findings integrated:
  - added Helm runtime guard so distroless app images cannot render without a migration image tag.
  - added workflow `runtime: distroless` insertion next to migration tag insertion.
  - kept IBW out of the current values rollout by routing both IBW image-build jobs to `node-runner`.
- [x] Slice 7 simplification completed by subagent `Banach`; accepted findings integrated:
  - both non-ARM and ARM IBW image jobs now use `target: node-runner`.
  - plan language updated because Slice 7 is no longer app-runner-only; it includes the migration guard and IBW compatibility target.
- [x] Slice 7 verification passed:
  - `git diff --check`
  - `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/docker-image-stg-arm.yml'); YAML.load_file('.github/workflows/docker-image-prd.yml'); puts 'yaml ok'"`
  - `helm template thesis-platform deploy/chart_new -f deploy/stg_new/values.yaml --set image.runtime=distroless`: failed as intended with `migration.image.tag is required when image.runtime is distroless`.
  - `helm template thesis-platform deploy/chart_new -f deploy/stg_new/values.yaml --set image.runtime=distroless --set migration.image.tag=migration-latest-arm-test --set migration.image.pullPolicy=IfNotPresent`: rendered migration image and no fallback command.
  - `helm template thesis-platform deploy/chart_new -f deploy/prd_new/values.yaml --set image.runtime=distroless`: failed as intended with `migration.image.tag is required when image.runtime is distroless`.
  - `helm template thesis-platform deploy/chart_new -f deploy/prd_new/values.yaml --set image.runtime=distroless --set migration.image.tag=migration-stable-arm-test --set migration.image.pullPolicy=IfNotPresent`: rendered migration image and no fallback command.
  - `helm template thesis-platform deploy/chart_new -f deploy/prd_ibw_new/values.yaml`: rendered current IBW fallback command against the IBW app image.
  - `docker build -t thesis-platform:distroless-smoke .`: default app image built with distroless runner.
  - `docker image inspect thesis-platform:distroless-smoke --format '{{.Architecture}} {{.Os}} {{json .Config.User}} {{json .Config.Entrypoint}} {{json .Config.Cmd}} {{json .Config.WorkingDir}}'`: `arm64 linux "65532" ["/nodejs/bin/node"] ["server.js"] "/app"`.
  - `docker run --rm thesis-platform:distroless-smoke -e "...distroless content check..."`: confirmed `server.js` exists and Prisma CLI/schema are absent.
  - `docker run` app server smoke on `thesis-platform:distroless-smoke`: Next server started and returned HTTP `404` for `/404` inside the Docker network.
  - `docker build --target migration-runner -t thesis-platform:migration-smoke .`: migration image still builds.
  - `docker build --target node-runner -t thesis-platform:node-runner-smoke .`: IBW compatibility image builds.
  - `docker run --rm thesis-platform:node-runner-smoke sh -c 'test -f /app/server.js && command -v prisma && prisma --version >/dev/null && echo node-runner-ok'`: confirmed app server file and Prisma CLI on `PATH`.
  - `docker run --rm --network thesis-platform_thesis-platform -e DATABASE_URL='postgresql://thesis:thesis@postgres:5432/thesis_node_runner_smoke_20260704_continue?sslmode=disable' thesis-platform:node-runner-smoke prisma migrate deploy`: applied baseline migration successfully on a fresh throwaway DB.
  - `docker run` app server smoke on `thesis-platform:node-runner-smoke`: Next server started and returned HTTP `404` for `/404` inside the Docker network.
  - `CI=true npx -y pnpm@11.9.0 run test:e2e`: 1 Chromium test passed with local PostgreSQL, OIDC, Azurite setup, sign-in, SAS minting, browser upload, and blob readback; existing styled-jsx hydration and LCP warnings still appear.
- [x] Slice 8 remaining major dependency upgrades completed:
  - Upgraded direct remaining major targets: `@azure/identity@4.13.1`, FontAwesome 7 packages, `@fortawesome/react-fontawesome@3.3.1`, `@tsconfig/next@2.0.6`, `concurrently@10.0.3`, `cross-fetch@4.1.0`, `cssnano@8.0.2`, `date-fns@4.4.0`, `dotenv-cli@11.0.0`, `prettier-plugin-organize-imports@4.3.0`, `react-dropzone@15.0.0`, `type-fest@5.7.0`, and `uuid@14.0.1`; upgraded direct `styled-jsx` to latest patch `5.1.7`.
  - Removed deprecated `@types/uuid`; `uuid@14.0.1` provides bundled declarations and `tsc` passed.
  - Removed unused direct `nodemailer`; source search found only commented `EmailProvider` code, and keeping it caused an incompatible optional peer warning with `next-auth@4.24.14`.
  - `ramda` / `@types/ramda` were already upgraded to `0.32.0`; no Slice 8 action needed.
  - `zod-openapi@6` is deferred because `trpc-to-openapi@3.3.0` declares peer `zod-openapi: ^5.4.4`.
  - `@types/node@26` is deferred because this branch targets Node 24 and direct types are already on the latest Node 24 line.
  - `eslint@10` remains deferred because `eslint-config-next@16.2.10` plugin peers still resolve cleanly on ESLint 9, not 10.
  - `@uzh-bf/design-system@4.1.6` lock metadata still says `engines.node: =22` while the app runs on Node 24. This is a private package metadata mismatch from the latest available design-system release, not a runtime failure: frozen install, `tsc`, Next build, DF webstats build, E2E, and Docker build passed under Node 24. Follow-up is to republish/upgrade the design system with Node 24 engine metadata.
  - Context7 date-fns docs checked: v4 changed deep/CommonJS default-export behavior, but app imports named functions from `date-fns`, so no local import migration is expected; new time-zone support is not adopted in this slice.
  - Context7 react-dropzone docs checked: v15 resets `isDragReject` after drop; app Dropzone render props use only `getRootProps`/`getInputProps`, so no local behavior change expected.
  - Registry peer/engine checks: Node 24 satisfies new package engines; `react-dropzone` peer range still omits React 19 but the current v14 package has the same stale peer shape, so this is not a new upgrade blocker.
  - Official changelog/release-note checks before edit:
    - Azure Identity 4.1 changed additional-tenant behavior; app has only a commented `@azure/identity` import, so no runtime migration.
    - FontAwesome 7 group upgraded together; compile catches missing icon exports.
    - `concurrently@10` drops Node <22 and becomes ESM-only; repo uses CLI scripts under Node 24.
    - `cross-fetch@4` drops old Node versions and keeps bundled declarations.
    - `cssnano@8` drops Node 20 and removes `cssDeclarationSorter` from the default preset; current PostCSS use is default `cssnano: {}`.
    - `date-fns@4` adds first-class time-zone support and keeps named top-level imports.
    - `dotenv-cli@11` primarily updates dotenv/dotenv-expand behavior; local scripts use basic `dotenv -e ... -- command` form.
    - `nodemailer@9` validates TLS for HTTPS remote content/OAuth/proxy by default; app does not configure an email provider in this branch, and usage search found only commented EmailProvider code, so the direct dependency was removed.
    - `prettier-plugin-organize-imports@4` breaking note is Vue/Volar-specific; app has no Vue.
    - `react-dropzone@15` rejected-drop UI should use callbacks/fileRejections, but app does not use rejected state.
    - `type-fest@5` requires Node 20+; app only imports `IterableElement`.
    - `uuid@14` keeps ESM/CJS exports and fixes TypeScript bundler resolution; app only imports `v4 as uuidv4`.
  - `pnpm peers check` initially failed on `@uzh-bf/design-system@4.1.6` FontAwesome peer ranges. The private design-system source imports normal FontAwesome icon definitions/components, and `tsc` plus `next build` passed with FontAwesome 7, so `pnpm-workspace.yaml` now contains exact `peerDependencyRules.allowedVersions` for that package only.
  - `styled-jsx@5.1.7` was kept as latest direct dependency even though Next still carries transitive `5.1.6`; this trades a small duplicate for satisfying the direct-dependency latest requirement, and Next/Turbopack builds passed.
  - Post-upgrade outdated check now reports only deliberate deferrals: `@types/node@26.1.0`, `eslint@10.6.0`, and `zod-openapi@6.0.0`.
- [x] Slice 8 review completed by subagent `Kepler`; accepted findings:
  - recorded the private design-system Node 22 engine metadata mismatch as a follow-up because latest `@uzh-bf/design-system@4.1.6` still builds and tests under Node 24.
  - updated progress with exact verification evidence before commit.
- [x] Slice 8 simplification completed by subagent `Laplace`; accepted findings or explicit deferrals:
  - removed stale `ramda` from the Slice 8 Do list.
  - updated `@types/uuid` and Next Steps wording.
  - accepted keeping `styled-jsx@5.1.7` for latest direct-dependency coverage after build proof, despite the duplicate with Next's transitive `5.1.6`.
  - deferred reverting the Prettier table reflow because the plan file was formatted with the repo's formatter after a formatting check failed.
- [x] Slice 8 verification passed:
  - `CI=true npx -y pnpm@11.9.0 install --frozen-lockfile`
  - `CI=true npx -y pnpm@11.9.0 peers check`
  - `CI=true npx -y pnpm@11.9.0 outdated --format json`: only deferred `@types/node@26.1.0`, `eslint@10.6.0`, and `zod-openapi@6.0.0` remain.
  - `git diff --check`
  - `CI=true npx -y pnpm@11.9.0 exec prettier --check package.json pnpm-workspace.yaml project/2026-07-02-dependency-refresh-oidc-azurite-plan.md`
  - `CI=true npx -y pnpm@11.9.0 run lint`: passed with the same 7 `react-hooks/set-state-in-effect` warnings and 0 errors.
  - `CI=true npx -y pnpm@11.9.0 exec tsc --noEmit`
  - `CI=true npx -y pnpm@11.9.0 run build`
  - `NEXT_PUBLIC_DEPARTMENT_NAME=DF ENABLE_DF_WEBSTATS=true CI=true npx -y pnpm@11.9.0 run build`
  - `CI=true npx -y pnpm@11.9.0 run test:e2e`: 1 Chromium test passed with local PostgreSQL, OIDC, Azurite setup, sign-in, SAS minting, browser upload, and blob readback; existing styled-jsx hydration and LCP warnings still appear.
  - `docker build -t thesis-platform:slice8-deps-smoke .`: passed and built the distroless app image.
- [x] Slice 9 final E2E evidence refresh completed:
  - Extended the existing browser smoke to verify the visible signed-in app shell and admin UI after local OIDC login, not only the session API and browser-origin Azurite PUT.
  - Kept the existing OpenAPI healthcheck, OIDC sign-in, SAS minting, browser upload, and Azurite readback path.
  - E2E first exposed a brittle broad `Admin` button selector and the overview's first-proposal auto-route. The final test proves the Admin entrypoint is visible, then navigates directly to `/admin` and asserts real tab roles to avoid that app race.
  - E2E also exposed date-fns v4 protected-token warnings for `dd.MM.Y`; fixed local date formatting to `dd.MM.yyyy`.
- [x] Slice 9 review completed by subagent `Raman`; no findings:
  - accepted: direct `/admin` navigation is valid after proving the visible Admin entrypoint, because the overview can auto-select the first proposal after data loads.
  - accepted: `dd.MM.yyyy` is the correct calendar-year token fix for date-fns v4.
- [x] Slice 9 simplification completed by subagent `Planck`; accepted findings integrated:
  - admin tab proof now uses `getByRole('tab', ...)` instead of broad text matching.
  - direct `/admin` navigation is documented in the test as race avoidance.
- [x] Slice 9 verification passed:
  - `rg -n "dd\\.MM\\.Y|format\\([^\\n]+['\"][^'\"]*Y" src tests -g '*.ts' -g '*.tsx'`: no remaining matches.
  - `CI=true npx -y pnpm@11.9.0 exec prettier --check src/components/ProposalMeta.tsx src/components/ApplicationDetailsModal.tsx tests/e2e/local-auth-blob.spec.ts project/2026-07-02-dependency-refresh-oidc-azurite-plan.md`
  - `CI=true npx -y pnpm@11.9.0 run lint`: passed with the same 7 `react-hooks/set-state-in-effect` warnings and 0 errors.
  - `CI=true npx -y pnpm@11.9.0 exec tsc --noEmit`
  - `CI=true npx -y pnpm@11.9.0 run build`
  - `CI=true npx -y pnpm@11.9.0 run test:e2e`: 1 Chromium test passed with local PostgreSQL, OIDC, Azurite setup, OpenAPI healthcheck, visible signed-in shell, admin tab UI, SAS minting, browser upload, and blob readback; existing styled-jsx hydration and LCP warnings still appear, and date-fns protected-token warnings are gone.
- [x] Slice 9 committed: `af49ff2 test(e2e): refresh dependency upgrade smoke coverage`.
- [x] Slice 10 final review and docs complete:
  - update README with final local OIDC/Azurite workflow, E2E command, runtime/deployment notes, NextAuth v5 decision, React Compiler/Turbopack status, and distroless migration-image constraint.
  - run final docs/check verification.
  - run mandatory final security review and independent branch review.
  - final `pnpm audit --audit-level high` first found critical/high issues in transitive release/dev tooling and direct `xlsx`; fixed by removing unused `localtunnel`, `@types/localtunnel`, and `npm-run-all`, adding scoped pnpm overrides for patched transitive packages, and replacing SheetJS `xlsx` export writes with `write-excel-file@4.1.1`.
  - final security review found the public SAS endpoint returned container-level write SAS; fixed by validating PDF upload intent, generating a server-side randomized blob name, returning only a blob-scoped upload URL, shortening SAS validity to 10 minutes, and uploading with no-overwrite conditions.
  - final branch review found the worktree dirty and noted manual deploy-tag updates could bypass the distroless migration-image guard; accepted action is to commit Slice 10, document that workflow-generated deployment values must carry both `runtime: distroless` and `migration.image.tag`, and restrict chart runtime values to `node-runner` or `distroless`.
  - post-review fixes applied and re-verified: compose ports bind loopback only; remaining `package.json` ranges exact-pinned + lockfile refreshed; `deploy/stg_new/values.yaml` and `deploy/prd_new/values.yaml` explicitly set `image.runtime: node-runner`; production deploy-image PR workflow no longer mutates `deploy/prd_ibw_new/values.yaml` (IBW stays separate).
  - reviewer findings ledger: FIXED loopback ports (Aristotle minor); FIXED explicit `node-runner` in current stg/prd values (Averroes/Aristotle runtime-guard bypass); FIXED prod workflow so IBW values remain separate (Averroes IBW stale workflow); FIXED exact package pins (Averroes minor). DEFERRED as accepted residual risk: Azure SAS does not bind file bytes/size/content-type or force browser `if-none-match`; follow-up is post-upload validation/scan (see Final Decisions And Follow-Ups).
  - worktree recovery (2026-07-04): original Codex worktree `f923` was removed mid-handoff; uncommitted Slice 10 work recovered intact from Codex snapshot commit `c9fa15e` (parent `af49ff2`), pinned as tag `recovery/slice10-snapshot`, and restored bit-for-bit into Claude worktree `~/.claude/worktrees/dependency-refresh/thesis-platform`. Working tree diff vs snapshot empty.
  - final verification re-run after all post-review fixes (Claude worktree, Node 24.18.0, pnpm 11.9.0):
    - `CI=true pnpm install --frozen-lockfile`: clean, 9.4s.
    - `CI=true pnpm run build`: Next 16.2.10 Turbopack compiled + 7/7 static pages, no errors.
    - `NEXT_PUBLIC_DEPARTMENT_NAME=DF ENABLE_DF_WEBSTATS=true CI=true pnpm run build`: compiled + 7/7 static pages, no errors.
    - `CI=true pnpm run test:e2e -- tests/e2e/local-auth-blob.spec.ts`: 1 Chromium test passed (7.4s) with local PostgreSQL, OIDC, Azurite setup, sign-in, SAS minting, browser upload, and blob readback; existing styled-jsx hydration and LCP dev warnings still appear.
    - `pnpm exec tsc --noEmit`: exit 0.
    - `pnpm run lint`: 0 errors, 7 known `react-hooks/set-state-in-effect` warnings (React Compiler cleanup scope).
    - Docker image rebuilds not re-run: Slice 10 did not touch `Dockerfile`; runtime image already proven in prior loop (app image user `65532`, entrypoint `/nodejs/bin/node`; migration image Prisma migrate deploy).

## Final Decisions And Follow-Ups

- NextAuth/Auth.js v5 is deferred. This branch stays on latest NextAuth v4 patch because local OIDC solves the development Auth0 dependency without taking the separate Auth.js v5 migration risk.
- Auth0 code remains env-gated for backward compatibility. Development defaults to local OIDC, and production keeps existing provider behavior unless `AUTH0_CLIENT_ID` is still configured.
- Turbopack is fully adopted through Next 16 defaults for `next dev` and `next build`; no `--webpack` fallback is used.
- React Compiler is enabled through the documented stable `reactCompiler: true` path. Existing compiler-readiness lint warnings remain cleanup scope because build and E2E pass.
- Distroless is adopted for the default app image. Distroless rollout requires a separate migration image tag; Helm fails rendering when `image.runtime=distroless` is set without `migration.image.tag`.
- Chart runtime values are limited to `node-runner` and `distroless`; the default compatibility runtime is `node-runner`.
- Database migrations continue to run through the Argo CD `PreSync` hook, like careers.
- Rollout order is staging first, then production after staging proof. `deploy/prd_ibw_new/values.yaml` remains untouched until a separate IBW rollout.
- Public upload remains allowed for proposal/application PDF forms, but SAS generation now returns blob-scoped, short-lived upload URLs for server-generated blob names instead of container-wide write SAS.
- `xlsx` is removed because npm has no patched release for current high-severity SheetJS advisories; admin XLSX exports now use `write-excel-file`.
- `pnpm audit --audit-level high` passes after the final dependency-audit fixes; remaining advisories are low/moderate.
- Follow-up: republish or upgrade `@uzh-bf/design-system` with Node 24 engine metadata; latest `4.1.6` still declares Node 22 while this app verifies under Node 24.
- Follow-up: confirm whether legacy deploy surfaces under `deploy/chart`, `deploy/stg`, and `deploy/prd` are retired before deleting or relying on them for future changes.
- Follow-up (accepted residual risk, security reviewer Aristotle): the blob-scoped SAS is much safer than before (blob-scoped, UUID-prefixed name, 10 min TTL) but Azure SAS cannot bind uploaded file bytes/size/content-type or force the browser helper's `if-none-match`. Add server-side post-upload validation/scan (size/content-type/magic-byte check) before treating an uploaded PDF as trusted. Not blocking for this branch.

## Next Steps

1. Commit Slice 10 (pending user approval): `chore(release): finalize dependency refresh rollout`. Stage explicit paths only.
2. Open/refresh PR to `main` with `df-mr-description-writer`; create as draft.
3. Before marking merge-ready: run `thermo-nuclear-code-quality-review`; resolve or explicitly defer findings.
4. After Slice 10 committed and PR safe: delete recovery tag `recovery/slice10-snapshot`.
5. Rollout order: staging first, then production; IBW (`deploy/prd_ibw_new`) only in a later separate rollout.
