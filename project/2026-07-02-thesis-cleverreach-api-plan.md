# Thesis CleverReach API + Infisical Deploy Cleanup Plan

Date: 2026-07-03
Branch: `codex/thesis-cleverreach-api`
Primary repo: `thesis-platform`
Companion repo: `df-cloud`
Target flow: thesis-platform repo first, df-cloud stg, then df-cloud prd.

## Goal

Move thesis CleverReach draft creation into app code and align deploy config with current Infisical-based runtime.

Do:

- Keep app-side CleverReach API draft creation.
- Use prepared CleverReach template `THESIS_PROPOSAL_V0`.
- Use thesis segment filter `521671` (`Thesen`) in group `560174`.
- Use Infisical/ExternalSecrets for runtime secrets.
- Remove old Doppler-era artifacts: envsubst, old Helm chart, old helmfile folders, Doppler helper scripts, Doppler wrapper scripts, and stale docs.
- Keep current ArgoCD path: `deploy/chart_new`.
- Keep current value files:
  - `deploy/stg_new/values.yaml`
  - `deploy/prd_new/values.yaml`
  - `deploy/prd_ibw_new/values.yaml`
- Reconcile df-cloud desired state with live ArgoCD state.

Do not:

- Edit Power Automate flow JSON.
- Rename `chart_new` to `chart` in this change.
- Enable IBW CleverReach unless explicitly requested.
- Commit secrets.
- Print Power Platform, CleverReach, or Infisical secret values.

## Current Evidence

Thesis repo:

- Local branch is ahead 8, behind `origin/main` by 1.
- Current branch still edits old deploy files. Stale. Must rework.
- `origin/main` commit: `b65cd32 enhance(analytics): add DF webstats tracking (#146)`.
- Old deploy files still exist in repo:
  - `deploy/chart/`
  - `deploy/stg/`
  - `deploy/prd/`
  - `deploy/_doppler_deploy_common.sh`
  - `deploy/doppler.yaml`
  - `doppler.yaml`
- New deploy files exist and are live:
  - `deploy/chart_new/`
  - `deploy/stg_new/values.yaml`
  - `deploy/prd_new/values.yaml`
  - `deploy/prd_ibw_new/values.yaml`

Live ArgoCD:

- `app-thesispf` stg source:
  - repo `https://github.com/uzh-bf/thesis-platform.git`
  - path `deploy/chart_new`
  - value file `../stg_new/values.yaml`
  - revision `b65cd32644a7690808b194ed1a61d10c9f9ca943`
- `app-thesispf` prd source:
  - path `deploy/chart_new`
  - value file `../prd_new/values.yaml`
  - revision `b65cd32644a7690808b194ed1a61d10c9f9ca943`
- `app-thesispf-ibw` prd source:
  - path `deploy/chart_new`
  - value file `../prd_ibw_new/values.yaml`
  - revision `b65cd32644a7690808b194ed1a61d10c9f9ca943`

df-cloud:

- `origin/stg` and `origin/prd` still say `path: deploy/${env}` for thesispf.
- Live ArgoCD says `path: deploy/chart_new`.
- Therefore df-cloud repo is stale relative to live state.
- Live objects still show Pulumi as manager. Need desired-state fix in df-cloud, not live patch.
- Current df-cloud checkout is dirty/unrelated. Use fresh worktree before edits.

Infisical/ExternalSecrets:

- Live thesispf ExternalSecrets are Ready in stg and prd.
- Current ExternalSecret key list has no CleverReach keys.
- Infisical CLI local status: unauthenticated.

CleverReach:

- DF DEV and DF PROD Power Platform accounts both authenticated to CleverReach.
- Template `THESIS_PROPOSAL_V0` exists in both.
- Thesis filter:
  - id `521671`
  - name `Thesen`
  - group id `560174`
  - group name `DF Community (Aktuelle Studierende)`

Power Automate:

- No flow JSON edits.
- Old thesis CleverReach path must be disabled by env/config before app path is enabled, otherwise duplicate drafts possible.

## Decisions

Deployment path:

- Keep `chart_new` and `_new` values because live ArgoCD already uses them.
- Delete old deployment files instead of updating them.
- Do not rename paths in this branch. Renaming would require live ArgoCD + df-cloud + GitHub workflow move in one bigger rollout.

Runtime env name:

- Replace app/chart use of `DOPPLER_CONFIG`.
- New neutral env var: `THESIS_PLATFORM_ENV`.
- Values: `dev`, `stg`, `prd`, `prd_ibw`.
- App fallback: if `THESIS_PLATFORM_ENV` missing, use existing safe fallbacks from `NODE_ENV` + department. No `DOPPLER_CONFIG` fallback after cleanup unless verification shows a still-live dependency.

Infisical secret contract:

- Add only required CleverReach keys to thesispf ExternalSecret:
  - `CLEVERREACH_CLIENT_ID`
  - `CLEVERREACH_CLIENT_SECRET`
  - `CLEVERREACH_FILTER_THESES`
- Do not add optional keys unless values are present in Infisical:
  - `CLEVERREACH_SENDER_NAME`
  - `CLEVERREACH_SENDER_EMAIL`
  - `CLEVERREACH_MAILING_NAME_PREFIX`
  - `CLEVERREACH_TEMPLATE_THESIS_PROPOSAL`
  - `CLEVERREACH_SUBJECT_THESIS_PROPOSAL`
- Reason: missing optional Infisical keys would break ESO sync. App already has safe defaults.

IBW:

- Do not add CleverReach keys to `thesispf-ibw` ExternalSecret.
- App sees missing required CR env -> skips CleverReach.

Power Automate:

- Extract old CleverReach credentials first.
- Then disable old DF Power Automate CleverReach path by setting old CR env vars to `EMPTY` or equivalent ops gate.
- Keep other Power Automate email/workflow behavior.

## Slice 0 - Rebase And Remove Stale Deploy Edits

Do:

- Rebase/merge branch on current `origin/main`.
- Keep app CleverReach implementation files.
- Remove prior edits to old deploy files:
  - `deploy/chart/templates/secret.yaml`
  - `deploy/chart/values.yaml`
  - `deploy/stg/values-envsubst.yaml`
  - `deploy/prd/values-envsubst.yaml`
  - `deploy/prd/helmfile.yaml`
- Update this plan if conflict resolution changes file list.

Check:

- `git status --short --branch`
- `git diff --name-status origin/main...HEAD`
- No `solutions/` changes.

Commit:

- `docs(project): replan thesis CleverReach Infisical rollout`

## Slice 1 - App CleverReach Path

Do:

- Keep/adjust app client:
  - `src/lib/cleverreach/client.ts`
  - `src/lib/cleverreach/config.ts`
  - `src/lib/cleverreach/thesisProposal.ts`
- Keep router integration in `src/server/routers/_app.ts`.
- Required env only:
  - `CLEVERREACH_CLIENT_ID`
  - `CLEVERREACH_CLIENT_SECRET`
  - `CLEVERREACH_FILTER_THESES`
- Defaults in code:
  - sender `DF Community <df-community@mailing.uzh.ch>`
  - template `THESIS_PROPOSAL_V0`
  - subject `New Thesis Available: {title}`
- Preheader:
  - no title
  - short
  - prefers `{studyLevel}, {topicArea}, {timeFrame}.`
- Staging guard:
  - no external CleverReach draft unless `STAGING_ENABLE_EXTERNAL_FLOWS=true`.

Check:

- fake-client script creates payload with `receivers.filter`, not `groups`.
- preheader under 80 chars, no title.
- missing env skips draft.
- `pnpm exec tsc --noEmit --incremental false --pretty false`
- `pnpm exec next lint`
- `pnpm test` if repo has test script; otherwise record "no test script".

Commit:

- `feat(cleverreach): create thesis proposal drafts from app`

## Slice 2 - Remove Doppler Runtime Naming

Do:

- Replace `DOPPLER_CONFIG` usage with `THESIS_PLATFORM_ENV`.
- Files likely:
  - `src/server/routers/_app.ts`
  - `src/lib/authOptions.ts`
  - `scripts/staging-reset-seed.ts`
  - `scripts/staging-db-backup.sh`
  - `docs/staging-mysql-reset.md`
  - `deploy/chart_new/templates/deployment.yaml`
- Keep value key `.Values.env`; only emitted env var name changes.

Check:

- `rg -n "DOPPLER_CONFIG" src scripts docs deploy/chart_new`
- `rg -n "doppler|Doppler" src scripts deploy/chart_new docs/staging-mysql-reset.md`
- Expected after slice: no active runtime refs. `package.json`, `README.md`, and old deploy docs are cleaned in Slice 4.
- Existing staging package commands set `THESIS_PLATFORM_ENV=stg` until Slice 4 removes Doppler wrapper scripts.
- `helm template thesis-platform deploy/chart_new -f deploy/stg_new/values.yaml`
- `helm template thesis-platform deploy/chart_new -f deploy/prd_new/values.yaml`
- `helm template thesis-platform deploy/chart_new -f deploy/prd_ibw_new/values.yaml`
- `pnpm exec tsc --noEmit --incremental false --pretty false`
- `pnpm test` if repo has test script; otherwise record "no test script".

Commit:

- `refactor(config): replace Doppler runtime environment marker`

## Slice 3 - Remove Old Deployment Artifacts

Do:

- Delete:
  - `deploy/chart/`
  - `deploy/stg/`
  - `deploy/prd/`
  - `deploy/_doppler_deploy_common.sh`
  - `deploy/doppler.yaml`
- Keep:
  - `deploy/chart_new/`
  - `deploy/stg_new/values.yaml`
  - `deploy/prd_new/values.yaml`
  - `deploy/prd_ibw_new/values.yaml`
- Audit workflows:
  - `.github/workflows/docker-image-stg-arm.yml`
  - `.github/workflows/docker-image-stg.yml`
  - `.github/workflows/docker-image-prd.yml`
- Update README/deploy docs that still instruct Doppler/envsubst deploy.
- Update `docs/prod-mysql-to-postgres.md` stale envsubst note or remove if obsolete.
- State current deploy model clearly:
  - no local deploy scripts.
  - ArgoCD pulls repo state.
  - `deploy/chart_new` and `_new` values are the only deploy artifacts kept.

Check:

- `find deploy -maxdepth 3 -type f | sort`
- no old deploy files.
- workflows still update `_new` values.
- `helm template` for stg/prd/prd_ibw from `chart_new`.
- `git diff --check origin/main...HEAD`

Commit:

- `deploy(thesis): remove legacy Doppler helm deployment`

## Slice 4 - Remove Doppler Scripts And Docs

Do:

- Remove old package scripts that are only Doppler wrappers.
- Remove root `doppler.yaml`.
- Do not mechanically translate every old Doppler wrapper to Infisical.
- Keep plain scripts that do not need secret injection:
  - `build`
  - `lint`
  - `prisma:generate`
  - release scripts
- Add only minimal Infisical-backed commands that are actively useful for local dev/admin:
  - likely `dev`
  - maybe `dev:ibw`
  - maybe one generic `script:<env>` helper if repo maintainers still need it
- Remove Doppler setup docs and replace with short Infisical note.
- Confirm whether repo should commit `.infisical.json`.
  - If team convention commits it: add project config without secrets.
  - If not: document `infisical login` / project selection in README only.

Check:

- `rg -n "doppler|DOPPLER" package.json README.md docs scripts deploy src`
- Expected: no active Doppler scripts/docs/runtime refs.
- `pnpm run prisma:generate`
- one minimal Infisical-backed command if local auth exists; otherwise document not run because local CLI unauthenticated.

Commit:

- `chore(config): remove Doppler scripts`

## Slice 5 - df-cloud Desired State

Worktree:

- Use fresh df-cloud worktree under `~/.codex/worktrees/thesispf-infisical/df-cloud`.
- Do not edit dirty existing checkout.

Do:

- Update `src/apps/thesispf/functions.ts`.
- ArgoCD app profile must match live:
  - `path: deploy/chart_new`
  - stg value file `../stg_new/values.yaml`
  - prd value file `../prd_new/values.yaml`
  - prd_ibw value file `../prd_ibw_new/values.yaml`
- ExternalSecrets:
  - base secrets stay shared.
  - add CleverReach required secrets only for `thesispf`.
  - do not add them to `thesispf-ibw`.
- Keep Infisical project slug `thesis-platform`.

Check:

- `pnpm exec tsc --noEmit`
- no unrelated dirty files staged.
- CI/Pulumi preview via GitLab, not local apply.
- Preview shows ArgoCD source path reconciliation and CleverReach ExternalSecret additions only.

Commit:

- `deploy(thesispf): align Infisical ArgoCD desired state`

## Slice 6 - Infisical Values And Old Flow Gate

Do:

- Ensure staging guard secret exists in Infisical stg:
  - `STAGING_ENABLE_EXTERNAL_FLOWS=false` by default.
  - set `true` only for controlled smoke.
  - reset to `false` after smoke.
- Populate Infisical stg:
  - `CLEVERREACH_CLIENT_ID`: from DF Thesis DEV Power Platform env
  - `CLEVERREACH_CLIENT_SECRET`: from DF Thesis DEV Power Platform env
  - `CLEVERREACH_FILTER_THESES`: `521671`
- Populate Infisical prd:
  - `CLEVERREACH_CLIENT_ID`: from DF Thesis PROD Power Platform env
  - `CLEVERREACH_CLIENT_SECRET`: from DF Thesis PROD Power Platform env
  - `CLEVERREACH_FILTER_THESES`: `521671`
- Leave `prd-ibw` without CleverReach keys unless explicitly requested.
- Staging old-flow gate:
  - disable old DF DEV Power Automate CleverReach path before stg app smoke if that env is used for stg.
  - keep other Power Automate behavior.
- Production old-flow gate:
  - do not disable old DF PROD Power Automate CleverReach path in this slice.
  - disable it during prod cutover only, immediately before app pods are restarted/synced with Infisical CleverReach env.
  - reason: avoid a gap where neither old flow nor app creates drafts.
  - do not alter flow logic.

Check:

- Secret presence only. Never print values.
- ExternalSecrets Ready after df-cloud rollout.
- App pods contain keys by name only if needed.
- Staging old Power Automate CR env gate inactive before stg smoke.
- Production old Power Automate CR env gate still active until prod cutover.

Commit:

- no repo commit for secret values.

## Slice 7 - Staging Smoke

Do:

- Deploy thesis app branch to stg.
- Deploy df-cloud stg companion MR first if needed.
- Set `STAGING_ENABLE_EXTERNAL_FLOWS=true` only for controlled smoke.
- Restart/sync stg app pods if needed so env secret changes are loaded.
- Submit one thesis proposal publish.
- Confirm:
  - proposal still created by Power Automate.
  - exactly one CleverReach draft appears.
  - draft uses template `THESIS_PROPOSAL_V0`.
  - subject contains title.
  - preheader contains study level/topic/time frame, not title.
  - receivers use filter `521671`.
  - old Power Automate CR path did not create duplicate.
- Reset `STAGING_ENABLE_EXTERNAL_FLOWS=false`.
- Restart/sync stg app pods if needed so reset is loaded.

Check:

- app logs around publish.
- CleverReach draft metadata.
- ArgoCD app Healthy/Synced.
- ExternalSecret Ready.

Commit:

- plan progress update only if smoke changes plan evidence.

## Slice 8 - Final Review, MR, Rollout

Do:

- Run final thesis verification.
- Run final df-cloud verification.
- Independent final branch review.
- Final security review.
- Use `$df-mr-description-writer` for MR descriptions.
- Target normal flow:
  - thesis-platform MR to `main` after stg validation.
  - df-cloud MR to `stg`; then promote to `prd` after stg evidence.
- Production cutover order:
  1. Confirm app code and df-cloud prd desired state are ready to sync.
  2. Confirm Infisical prd CleverReach keys exist, but current pods have not loaded them unless intentionally restarted.
  3. Disable old DF PROD Power Automate CleverReach env gate.
  4. Sync/restart app pods so app-side CleverReach env is loaded.
  5. Smoke one prd publish or controlled draft path.
  6. If app path fails, re-enable old Power Automate gate or roll back app env before more publishes.

Check:

- `git diff --name-status <target>...HEAD`
- `git diff --check <target>...HEAD`
- CI green.
- ArgoCD rollout monitored.
- prd smoke confirms one draft only.
- No draft-creation gap longer than cutover window.

Commit:

- final plan progress update if needed.

## Risks

- df-cloud repo drift: live ArgoCD already differs from `origin/stg`/`origin/prd`. Fix desired state before applying.
- Duplicate drafts: old Power Automate CleverReach env must be disabled before app env enabled.
- Optional CR envs in ExternalSecrets can break ESO if absent. Keep required keys only.
- `THESIS_PLATFORM_ENV` rename touches staging safety. Verify stg guard before smoke.
- Removing old deploy folders removes dead deploy artifacts only. Live deploy is ArgoCD repo pull.
- Infisical CLI local unauthenticated. Secret writes may need browser/API/session auth.
- EnvFrom secrets are not hot-reloaded into running pods. Any Infisical key or staging-flag change needs pod restart/sync before app behavior changes.
- Production old-flow disable must be sequenced with app pod restart to avoid draft gap.

## Progress

- [x] Rechecked thesis `origin/main`.
- [x] Rechecked df-cloud `origin/stg` and `origin/prd`.
- [x] Verified live ArgoCD thesispf source path and value files.
- [x] Verified thesispf ExternalSecrets Ready in stg/prd.
- [x] Verified current ExternalSecrets lack CleverReach keys.
- [x] Queried CleverReach through Power Platform credentials without printing secrets.
- [x] Found thesis filter id `521671`.
- [x] Found template `THESIS_PROPOSAL_V0`.
- [x] Reviewed plan with `agy` / Gemini 3.5 Flash High.
- [x] Accepted `agy` findings: staging flag lifecycle, prod cutover sequencing, test-script caveat.
- [x] Committed reviewed plan: `docs(project): replan thesis CleverReach Infisical rollout`.
- [x] Rebased thesis branch on `origin/main` at `b65cd32`.
- [x] Restored stale old-deploy CleverReach edits from `origin/main`; old deploy files will be deleted later in Slice 3.
- [x] Slice 0 review done: commit deploy reverts plus plan progress; no critical findings.
- [x] Slice 0 simplification done: no smaller cleanup; keep deletion for Slice 3.
- [x] Slice 1 app CleverReach path inspected:
  - required envs only: `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, `CLEVERREACH_FILTER_THESES`.
  - receiver payload uses `receivers.filter`.
  - preheader builder avoids title and stays under 80 chars in verifier.
  - staging guard reuses `STAGING_ENABLE_EXTERNAL_FLOWS`.
- [x] Slice 1 verification:
  - `./node_modules/.bin/tsx scripts/verify-cleverreach-thesis.ts`
  - `./node_modules/.bin/tsc --noEmit --incremental false --pretty false`
  - `./node_modules/.bin/next lint`
  - no `pnpm test` script exists.
  - `pnpm exec ...` blocked before command execution by local pnpm ignored-build policy; direct binaries used instead.
- [x] Slice 1 review done: no critical or important correctness findings.
- [x] Slice 1 simplification accepted:
  - removed unused `CLEVERREACH_ADMIN_URL` / `adminUrl`.
  - added verifier assertion for actual CleverReach HTTP body using `receivers.filter`.
  - kept DB polling as temporary app-only bridge because Power Automate flow JSON is out of scope.
- [x] Slice 1 final delta review done: no critical, important, or minor findings.
- [x] Slice 2 done:
  - replaced active runtime `DOPPLER_CONFIG` marker with `THESIS_PLATFORM_ENV`.
  - kept `.Values.env` as the Helm values key.
  - bridged existing staging package commands with `THESIS_PLATFORM_ENV=stg` until Slice 4 removes Doppler wrapper scripts.
  - removed inert prod/prd_ibw `STAGING_GRANT_ALL_ADMINS` manifest output.
  - verification:
    - `rg -n "DOPPLER_CONFIG" src scripts docs deploy/chart_new` returned no matches.
    - `rg -n "doppler|Doppler" src scripts deploy/chart_new docs/staging-mysql-reset.md` returned no matches.
    - `env THESIS_PLATFORM_ENV=stg bash scripts/staging-db-backup.sh` passed the env guard and stopped at expected missing `DATABASE_URL` guard.
    - `helm template thesis-platform deploy/chart_new -f deploy/stg_new/values.yaml`
    - `helm template thesis-platform deploy/chart_new -f deploy/prd_new/values.yaml`
    - `helm template thesis-platform deploy/chart_new -f deploy/prd_ibw_new/values.yaml`
    - rendered env check: stg emits `THESIS_PLATFORM_ENV=stg` and `STAGING_GRANT_ALL_ADMINS`; prd/prd_ibw emit `THESIS_PLATFORM_ENV` only.
    - `./node_modules/.bin/tsc --noEmit --incremental false --pretty false`
    - `./node_modules/.bin/next lint`
    - `./node_modules/.bin/tsx scripts/verify-cleverreach-thesis.ts`
    - `git diff --check`
  - Slice 2 correctness review: initial Important package bridge finding resolved; final delta `DONE`, no findings.
  - Slice 2 simplification review: final delta `DONE`, no findings.
- [x] Add `THESIS_PLATFORM_ENV`.
- [x] Slice 3 done:
  - removed legacy deploy-scoped Doppler/envsubst/Helmfile artifacts under `deploy/chart`, `deploy/stg`, `deploy/prd`, `deploy/_doppler_deploy_common.sh`, and `deploy/doppler.yaml`.
  - kept root `doppler.yaml` until Slice 4 so remaining package Doppler scripts stay coherent within this commit.
  - kept current ArgoCD artifacts only: `deploy/chart_new`, `deploy/stg_new/values.yaml`, `deploy/prd_new/values.yaml`, `deploy/prd_ibw_new/values.yaml`.
  - updated README and prod migration deploy notes to say ArgoCD pulls repo state and local Helmfile/envsubst deploy scripts must not be used.
  - verified workflows already target `_new` values.
  - verification:
    - `find deploy -maxdepth 3 -type f | sort`
    - stale deploy-script reference scan outside the plan found only negative docs saying not to use local Helmfile/envsubst.
    - `helm template thesis-platform deploy/chart_new -f deploy/stg_new/values.yaml`
    - `helm template thesis-platform deploy/chart_new -f deploy/prd_new/values.yaml`
    - `helm template thesis-platform deploy/chart_new -f deploy/prd_ibw_new/values.yaml`
    - `git diff --check HEAD`
  - Slice 3 correctness review: initial Important root `doppler.yaml` finding resolved; final delta `DONE`, no findings.
  - Slice 3 simplification review: removed orphan README heading and redundant progress item; final delta `DONE`, no findings.
- [x] Slice 4 done:
  - removed remaining package Doppler wrappers and root `doppler.yaml`.
  - kept package scripts as plain environment-variable based commands that can be wrapped with `infisical run --env=<env> -- ...`.
  - ignored local `.infisical.json` and documented local `infisical login` / `infisical init`.
  - replaced active seed-script Doppler wording with neutral environment-variable wording.
  - verification:
    - `rg -n "doppler|Doppler|DOPPLER" package.json README.md docs scripts deploy src prisma` returned no matches.
    - `infisical run --help` confirmed `--env` and `-- ...` command syntax.
    - `./node_modules/.bin/prisma generate`
    - `./node_modules/.bin/tsc --noEmit --incremental false --pretty false`
    - `./node_modules/.bin/next lint`
    - `./node_modules/.bin/tsx scripts/verify-cleverreach-thesis.ts`
    - `env THESIS_PLATFORM_ENV=stg bash scripts/staging-db-backup.sh` passed the env guard and stopped at expected missing `DATABASE_URL` guard.
    - `git diff --check HEAD`
    - no `pnpm test` script exists.
  - `pnpm run prisma:generate` and `pnpm run staging:db:backup` still fail before script execution because local pnpm runs a dependency-status install blocked by `ERR_PNPM_IGNORED_BUILDS`; direct binaries verified the underlying commands.
  - Slice 4 correctness review: `DONE`, no findings.
  - Slice 4 simplification review: removed unnecessary `dev:tunnel`; final delta only requested this progress update.
- [x] Slice 5 done:
  - created fresh df-cloud worktree: `/Users/rschlae/.codex/worktrees/thesispf-infisical/df-cloud`.
  - branch: `codex/thesispf-infisical`.
  - base: current `origin/stg` / `a513d95c535571d52ef946cedb88251d7186f88a`.
  - committed companion change: `f08ae0f deploy(thesispf): align Infisical ArgoCD desired state`.
  - aligned thesispf ArgoCD desired state:
    - repository `https://github.com/uzh-bf/thesis-platform.git`
    - path `deploy/chart_new`
    - value files `../stg_new/values.yaml`, `../prd_new/values.yaml`, `../prd_ibw_new/values.yaml`
  - added required CleverReach ExternalSecret keys only to `thesispf`:
    - `CLEVERREACH_CLIENT_ID`
    - `CLEVERREACH_CLIENT_SECRET`
    - `CLEVERREACH_FILTER_THESES`
  - left `thesispf-ibw` without CleverReach keys.
  - added `STAGING_ENABLE_EXTERNAL_FLOWS` to stg ExternalSecret only.
  - verification:
    - GitLab API confirmed local df-cloud `origin/stg` and `origin/prd` heads before worktree setup; branch was later rebased to `a513d95` when `origin/stg` advanced.
    - submodules initialized via HTTPS/glab fallback because SSH signing failed.
    - `/Users/rschlae/.volta/bin/pnpm install --frozen-lockfile`
    - direct `azure-helpers` `tsup` build
    - `src/apps/thesispf/node_modules/.bin/tsc --noEmit --project src/apps/thesispf/tsconfig.json --pretty false`
    - `node_modules/.bin/prettier --check src/apps/thesispf/functions.ts`
    - `git diff --check`
    - no local Pulumi preview/up was run; df-cloud preview remains GitLab CI-only.
  - Slice 5 correctness review: `DONE`, no findings.
  - Slice 5 simplification review: inlined value file path and final delta `DONE`, no findings.
- [ ] Populate Infisical values.
  - Slice 6 status: Infisical upgraded; write access still the only blocker.
  - Infisical servers:
    - stg: `infisical/infisical:v0.161.12`
    - prd: `infisical/infisical:v0.161.12`
  - API compatibility:
    - `/api/v4/secrets` now exists; unauthenticated dummy probes return 401.
    - use `/api/v4/secrets`, not the old `/api/v3/secrets/raw` route.
    - stg project id: `1abaaea3-1bfd-4a53-ab71-114225ad27d9`.
    - prd project id: `3a5a7194-3034-44ee-8a58-97b8d98effef`.
  - Current access:
    - local Infisical CLI profile has invalid token format.
    - Azure CLI user lacks list permission on `kv-stg-thesispf-8dh3u` and `kv-prd-thesispf-LxhJG`.
    - AKS SecretStore machine identities validate and can read project metadata and v4 secrets by status only.
    - no write attempt after upgrade; investigation stayed read-only.
  - Presence checks, values not printed:
    - stg Infisical has `APP_URL`.
    - stg Infisical lacks `STAGING_ENABLE_EXTERNAL_FLOWS`, `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, `CLEVERREACH_FILTER_THESES`.
    - prd Infisical has `APP_URL`.
    - prd Infisical lacks `STAGING_ENABLE_EXTERNAL_FLOWS`, `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, `CLEVERREACH_FILTER_THESES`.
  - Needed unblock:
    - Infisical admin/user token, fixed CLI login, or temporary write-capable machine identity for `thesis-platform`.
  - Next write plan once access exists:
    - create stg `STAGING_ENABLE_EXTERNAL_FLOWS=false`.
    - create stg `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, `CLEVERREACH_FILTER_THESES=521671`.
    - create prd `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, `CLEVERREACH_FILTER_THESES=521671`.
    - verify with v4 status checks only; do not print values.
- [ ] Disable old Power Automate CleverReach gate.
  - Slice 6 mapping done; no flow disabled yet because Infisical app-side keys are not present.
  - DEV and PROD both have populated value rows for:
    - `uzhbf_thesisplatform_cleverreach_client_id_env_var`
    - `uzhbf_thesisplatform_cleverreach_client_secret_env_var`
  - DEV and PROD both have a separate activated modern flow:
    - `UZH BF Thesis Platform - Cleverreach`
  - Recommended gate for stg smoke/prod cutover:
    - turn off only `UZH BF Thesis Platform - Cleverreach`.
    - leave proposal posting/application/email flows active.
    - do not clear Power Platform env vars unless we have a value backup and rollback path.
- [ ] Run stg smoke.
- [ ] Promote prd.

## Next Step

Get write-capable Infisical auth for project `thesis-platform`, then create missing stg/prd keys through `/api/v4/secrets`. After key presence is confirmed, rebase df-cloud branch `codex/thesispf-infisical` because it is now behind `origin/stg`, push the df-cloud MR, run GitLab Pulumi preview, and continue with controlled stg smoke.
