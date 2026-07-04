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
- Current state: plan only

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
- Replace direct global `prisma` execution with a Kubernetes-safe package script, for example `pnpm run prisma:deploy:k8s`, where the script runs `prisma migrate deploy` without Doppler because Kubernetes secrets provide env vars.
- Add `CI=true` to the migration job when invoking pnpm.
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
- Browser must reach Azurite via `http://127.0.0.1:10000/devstoreaccount1`.
- Server running inside Docker may need different endpoint host than browser.

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
- `nodemailer`: `6.9.4` -> `9.0.3`
- `cross-fetch`: `3.1.5` -> `4.1.0`
- `cssnano`: `7.1.1` -> `8.0.2`
- `prettier-plugin-organize-imports`: `3.2.3` -> `4.3.0`
- `react-dropzone`: `14.2.3` -> `15.0.0`

Risk:

- Script behavior may change for `concurrently` and `dotenv-cli`.
- `react-dropzone` API/types may alter accept/dropzone props.
- `cross-fetch` may be removable because modern Node has fetch, but leave removal for separate cleanup unless safe.

Decision:

- Upgrade and validate scripts.
- Do not remove packages unless unused and verified.

New feature candidates:

- None for current branch.

## Minor/Patch Upgrade Findings

Minor/patch upgrades will be applied after major upgrade plan is clear. These still require build + browser verification, but no detailed changelog gate unless a failure points at the package.

| Package | Current | Latest | Type | Research |
| --- | ---: | ---: | --- | --- |
| `@azure/storage-blob` | `12.15.0` | `12.33.0` | minor | Azure SDK changelog/docs checked for Azurite/SAS path |
| `@microsoft/microsoft-graph-types` | `2.38.0` | `2.43.1` | minor | registry + repo metadata |
| `@tailwindcss/postcss` | `~4.1.12` | `4.3.2` | minor | Tailwind group |
| `@tanstack/react-query` | `^5.85.5` | `5.101.2` | minor | v5 same major |
| `@tanstack/react-query-devtools` | `^5.85.5` | `5.101.2` | minor | v5 same major |
| `@trpc/client` | `11.5.0` | `11.18.0` | minor | v11 same major |
| `@trpc/next` | `11.5.0` | `11.18.0` | minor | v11 same major |
| `@trpc/react-query` | `11.5.0` | `11.18.0` | minor | v11 same major |
| `@trpc/server` | `11.5.0` | `11.18.0` | minor | v11 same major |
| `@uzh-bf/design-system` | `4.0.11` | `4.1.6` | minor | private/local package metadata only; verify UI carefully |
| `autoprefixer` | `10.4.15` | `10.5.2` | minor | PostCSS group |
| `axios` | `1.5.1` | `1.18.1` | minor | v1 same major |
| `postcss` | `8.4.47` | `8.5.16` | minor | PostCSS group |
| `prettier` | `3.6.2` | `3.9.4` | minor | v3 same major |
| `prettier-plugin-tailwindcss` | `~0.6.14` | `0.8.0` | minor | plugin peer compatibility with Prettier 3 |
| `react-hot-toast` | `2.4.1` | `2.6.0` | minor | v2 same major |
| `tailwind-merge` | `3.3.1` | `3.6.0` | minor | v3 same major |
| `tailwindcss` | `~4.1.12` | `4.3.2` | minor | Tailwind 4 same major |
| `trpc-to-openapi` | `^3.0.1` | `3.3.0` | minor | v3 same major |
| `tsx` | `^4.19.2` | `4.22.5` | minor | v4 same major |
| `tw-animate-css` | `~1.3.4` | `1.4.0` | minor | v1 same major |
| `@microsoft/microsoft-graph-client` | `3.0.5` | `3.0.7` | patch | registry metadata |
| `@tailwindcss/forms` | `~0.5.10` | `0.5.11` | patch | registry metadata |
| `@tailwindcss/typography` | `~0.5.16` | `0.5.20` | patch | registry metadata |
| `@types/jsonwebtoken` | `^9.0.0` | `9.0.10` | patch | registry metadata |
| `dayjs` | `^1.11.13` | `1.11.21` | patch | registry metadata |
| `formik` | `2.4.6` | `2.4.9` | patch | registry metadata |
| `jsonwebtoken` | `9.0.1` | `9.0.3` | patch | registry metadata |
| `next-auth` | `4.24.11` | `4.24.14` | patch | stable latest only; v5 beta deferred |
| `nextjs-cors` | `2.2.0` | `2.2.1` | patch | registry metadata |
| `ts-node` | `10.9.1` | `10.9.2` | patch | registry metadata |

Already-latest direct dependencies:

`@next-auth/prisma-adapter`, `@tailwindcss/aspect-ratio`, `@types/archiver`, `@types/localtunnel`, `@uidotdev/usehooks`, `archiver`, `localforage`, `localtunnel`, `node-fetch`, `npm-run-all`, `standard-version`, `tailwindcss-animate`, `tailwindcss-radix`, `ts-node-dev`, `xlsx`.

## Full Dependency Research Inventory

| Package | Current | Latest | Type | Source |
| --- | ---: | ---: | --- | --- |
| `@azure/identity` | `3.3.0` | `4.13.1` | major | https://github.com/Azure/azure-sdk-for-js |
| `@azure/storage-blob` | `12.15.0` | `12.33.0` | minor | https://github.com/Azure/azure-sdk-for-js |
| `@fortawesome/fontawesome-svg-core` | `6.7.2` | `7.3.0` | major | https://github.com/FortAwesome/Font-Awesome |
| `@fortawesome/free-regular-svg-icons` | `6.7.2` | `7.3.0` | major | https://github.com/FortAwesome/Font-Awesome |
| `@fortawesome/free-solid-svg-icons` | `6.7.2` | `7.3.0` | major | https://github.com/FortAwesome/Font-Awesome |
| `@fortawesome/react-fontawesome` | `0.2.2` | `3.3.1` | major | https://github.com/FortAwesome/react-fontawesome |
| `@microsoft/microsoft-graph-client` | `3.0.5` | `3.0.7` | patch | https://github.com/microsoftgraph/msgraph-sdk-javascript |
| `@microsoft/microsoft-graph-types` | `2.38.0` | `2.43.1` | minor | https://github.com/microsoftgraph/msgraph-typescript-typings |
| `@next-auth/prisma-adapter` | `1.0.7` | `1.0.7` | same | https://github.com/nextauthjs/next-auth |
| `@prisma/client` | `6.15.0` | `7.8.0` | major | https://github.com/prisma/prisma |
| `@tailwindcss/aspect-ratio` | `~0.4.2` | `0.4.2` | same | https://github.com/tailwindlabs/tailwindcss-aspect-ratio |
| `@tailwindcss/forms` | `~0.5.10` | `0.5.11` | patch | https://github.com/tailwindlabs/tailwindcss-forms |
| `@tailwindcss/postcss` | `~4.1.12` | `4.3.2` | minor | https://github.com/tailwindlabs/tailwindcss |
| `@tailwindcss/typography` | `~0.5.16` | `0.5.20` | patch | https://github.com/tailwindlabs/tailwindcss-typography |
| `@tanstack/react-query` | `^5.85.5` | `5.101.2` | minor | https://github.com/TanStack/query |
| `@tanstack/react-query-devtools` | `^5.85.5` | `5.101.2` | minor | https://github.com/TanStack/query |
| `@trpc/client` | `11.5.0` | `11.18.0` | minor | https://github.com/trpc/trpc |
| `@trpc/next` | `11.5.0` | `11.18.0` | minor | https://github.com/trpc/trpc |
| `@trpc/react-query` | `11.5.0` | `11.18.0` | minor | https://github.com/trpc/trpc |
| `@trpc/server` | `11.5.0` | `11.18.0` | minor | https://github.com/trpc/trpc |
| `@tsconfig/next` | `1.0.5` | `2.0.6` | major | https://github.com/tsconfig/bases |
| `@tsconfig/node18` | `2.0.0` | replace with `@tsconfig/node24@24.0.4` | runtime alignment | https://github.com/tsconfig/bases |
| `@types/archiver` | `^8.0.0` | `8.0.0` | same | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `@types/jsonwebtoken` | `^9.0.0` | `9.0.10` | patch | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `@types/localtunnel` | `^2.0.4` | `2.0.4` | same | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `@types/node` | `^18.8.4` | `26.1.0` | major | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `@types/ramda` | `^0.29.0` | `0.32.0` | minor | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `@types/react` | `^18.0.21` | `19.2.17` | major | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `@types/react-dom` | `^18.0.6` | `19.2.3` | major | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `@types/uuid` | `^10.0.0` | `11.0.0` | major/remove | npm deprecated metadata |
| `@uidotdev/usehooks` | `2.4.1` | `2.4.1` | same | https://github.com/uidotdev/usehooks |
| `@uzh-bf/design-system` | `4.0.11` | `4.1.6` | minor | private npm metadata |
| `archiver` | `^8.0.0` | `8.0.0` | same | https://github.com/archiverjs/node-archiver |
| `autoprefixer` | `10.4.15` | `10.5.2` | minor | https://github.com/postcss/autoprefixer |
| `axios` | `1.5.1` | `1.18.1` | minor | https://github.com/axios/axios |
| `concurrently` | `^9.2.0` | `10.0.3` | major | https://github.com/open-cli-tools/concurrently |
| `cross-fetch` | `3.1.5` | `4.1.0` | major | https://github.com/lquixada/cross-fetch |
| `cssnano` | `7.1.1` | `8.0.2` | major | https://github.com/cssnano/cssnano |
| `date-fns` | `2.30.0` | `4.4.0` | major | https://github.com/date-fns/date-fns |
| `dayjs` | `^1.11.13` | `1.11.21` | patch | https://github.com/iamkun/dayjs |
| `dotenv-cli` | `7.3.0` | `11.0.0` | major | https://github.com/entropitor/dotenv-cli |
| `eslint` | `8.48.0` | `10.6.0` | major | https://github.com/eslint/eslint |
| `eslint-config-next` | `13.4.19` | `16.2.10` | major | https://github.com/vercel/next.js |
| `formik` | `2.4.6` | `2.4.9` | patch | https://github.com/jaredpalmer/formik |
| `jsonwebtoken` | `9.0.1` | `9.0.3` | patch | https://github.com/auth0/node-jsonwebtoken |
| `localforage` | `1.10.0` | `1.10.0` | same | https://github.com/localForage/localForage |
| `localtunnel` | `^2.0.2` | `2.0.2` | same | https://github.com/localtunnel/localtunnel |
| `next` | `15.3.4` | `16.2.10` | major | https://github.com/vercel/next.js |
| `next-auth` | `4.24.11` | `4.24.14` | patch | https://github.com/nextauthjs/next-auth |
| `nextjs-cors` | `2.2.0` | `2.2.1` | patch | https://github.com/yonycalsin/nextjs-cors |
| `node-fetch` | `3.3.2` | `3.3.2` | same | https://github.com/node-fetch/node-fetch |
| `nodemailer` | `6.9.4` | `9.0.3` | major | https://github.com/nodemailer/nodemailer |
| `npm-run-all` | `4.1.5` | `4.1.5` | same | https://github.com/mysticatea/npm-run-all |
| `postcss` | `8.4.47` | `8.5.16` | minor | https://github.com/postcss/postcss |
| `prettier` | `3.6.2` | `3.9.4` | minor | https://github.com/prettier/prettier |
| `prettier-plugin-organize-imports` | `3.2.3` | `4.3.0` | major | https://github.com/simonhaenisch/prettier-plugin-organize-imports |
| `prettier-plugin-tailwindcss` | `~0.6.14` | `0.8.0` | minor | https://github.com/tailwindlabs/prettier-plugin-tailwindcss |
| `prisma` | `6.15.0` | `7.8.0` | major | https://github.com/prisma/prisma |
| `ramda` | `0.29.0` | `0.32.0` | minor | https://github.com/ramda/ramda |
| `react` | `19.1.1` | `19.2.7` | minor | https://github.com/facebook/react |
| `react-dom` | `19.1.1` | `19.2.7` | minor | https://github.com/facebook/react |
| `react-dropzone` | `14.2.3` | `15.0.0` | major | https://github.com/react-dropzone/react-dropzone |
| `react-hot-toast` | `2.4.1` | `2.6.0` | minor | https://github.com/timolins/react-hot-toast |
| `standard-version` | `9.5.0` | `9.5.0` | same | https://github.com/conventional-changelog/standard-version |
| `tailwind-merge` | `3.3.1` | `3.6.0` | minor | https://github.com/dcastil/tailwind-merge |
| `tailwindcss` | `~4.1.12` | `4.3.2` | minor | https://github.com/tailwindlabs/tailwindcss |
| `tailwindcss-animate` | `~1.0.7` | `1.0.7` | same | npm metadata |
| `tailwindcss-radix` | `4.0.2` | `4.0.2` | same | https://github.com/ecklf/tailwindcss-radix |
| `trpc-to-openapi` | `^3.0.1` | `3.3.0` | minor | https://github.com/mcampa/trpc-to-openapi |
| `ts-node` | `10.9.1` | `10.9.2` | patch | https://github.com/TypeStrong/ts-node |
| `ts-node-dev` | `2.0.0` | `2.0.0` | same | https://github.com/whitecolor/ts-node-dev |
| `tsx` | `^4.19.2` | `4.22.5` | minor | https://github.com/privatenumber/tsx |
| `tw-animate-css` | `~1.3.4` | `1.4.0` | minor | https://github.com/Wombosvideo/tw-animate-css |
| `type-fest` | `4.5.0` | `5.7.0` | major | https://github.com/sindresorhus/type-fest |
| `typescript` | `5.9.2` | `6.0.3` | major | https://github.com/microsoft/TypeScript |
| `uuid` | `^11.0.5` | `14.0.1` | major | https://github.com/uuidjs/uuid |
| `xlsx` | `^0.18.5` | `0.18.5` | same | https://github.com/SheetJS/sheetjs |
| `yup` | `1.6.1` | `1.7.1` | minor | https://github.com/jquense/yup |
| `zod` | `^4.1.3` | `4.4.3` | minor | https://github.com/colinhacks/zod |

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
- Add a Kubernetes-safe migration script, for example `prisma:deploy:k8s`, that runs `prisma migrate deploy` without Doppler.
- Keep migrations on the Argo `PreSync` hook path, like careers.
- Change the migration hook from direct global `prisma` to a package script or explicit local CLI invocation.
- Add `CI=true` to the migration job if the hook invokes pnpm.
- Remove the app runtime dependency on global Prisma if the migration image/stage covers it.
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
- Upgrade FontAwesome, Azure identity, date-fns, nodemailer, dotenv-cli, concurrently, cssnano, react-dropzone, type-fest, ramda, uuid, cross-fetch, prettier plugin.
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
- `CI=true npx -y pnpm@10.15.0 exec tsc --noEmit`: failed on existing strict TypeScript errors, including Prisma generated-client typing/export resolution and many implicit `any` / `unknown` errors.

Decision:

- Do not claim type-clean baseline.
- Slices must run slice-specific checks and include build/lint/`tsc` evidence where relevant.
- Treat `tsc` as an existing failing gate until a dedicated type cleanup or framework/tooling slice fixes it.
- Same known `tsc` failure is allowed until cleanup; new or expanded type errors block slice commit.
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
- [x] Baseline verification completed with known `tsc` failure recorded.
- [ ] Implementation pending.

## Open Questions

- Should Auth0 code be fully removed, or only removed from development path while old chart values remain?
- Should distroless be required in this branch if it requires a second migration-capable image, or is proving and deferring the final switch acceptable?
- Should React Compiler use stable Babel plugin path first, or try Turbopack Rust compiler immediately?
- Are legacy deploy surfaces under `deploy/chart`, `deploy/stg`, and `deploy/prd` still active, or can this branch target only the current staging and production deploy files?

## Next Steps

1. Commit Slice 0 baseline/progress update.
2. Start Slice 1.
