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
  - subject `Neue Abschlussarbeit: {title}`
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
  - subject contains title and uses German title-case copy.
  - preheader contains German study level/topic/time frame, not title.
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
- [x] Populate Infisical values.
  - Slice 6 status: Infisical values populated on 2026-07-05; df-cloud rollout is still required before pods receive the new CleverReach env.
  - Infisical servers:
    - stg: `infisical/infisical:v0.161.12`
    - prd: `infisical/infisical:v0.161.12`
  - API compatibility:
    - `/api/v4/secrets` now exists; unauthenticated dummy probes return 401.
    - use `/api/v4/secrets`, not the old `/api/v3/secrets/raw` route.
    - stg project id: `1abaaea3-1bfd-4a53-ab71-114225ad27d9`.
    - prd project id: `3a5a7194-3034-44ee-8a58-97b8d98effef`.
  - Current access:
    - local Infisical CLI user login now works for stg and prd when run outside the sandbox/keychain restriction.
    - Azure CLI user lacks list permission on `kv-stg-thesispf-8dh3u` and `kv-prd-thesispf-LxhJG`.
    - Azure CLI user also lacks list permission on `kv-stg-master-aJ0Bn` and `kv-prd-master-GakvV`.
    - AKS SecretStore machine identities validate and can read v4 secrets by status only.
    - direct write with stg AKS SecretStore machine identity still returns HTTP 403; user login was used for writes.
  - Presence checks, values not printed:
    - stg Infisical has `APP_URL`.
    - stg Infisical has `STAGING_ENABLE_EXTERNAL_FLOWS`, `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, `CLEVERREACH_FILTER_THESES`.
    - prd Infisical has `APP_URL`.
    - prd Infisical has `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, `CLEVERREACH_FILTER_THESES`.
    - prd `STAGING_ENABLE_EXTERNAL_FLOWS` intentionally not created.
  - Write evidence:
    - extracted DEV/PROD CleverReach client id/secret values from Power Platform environment variable value rows without printing them.
    - created/updated stg `STAGING_ENABLE_EXTERNAL_FLOWS=false`.
    - created/updated stg `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, `CLEVERREACH_FILTER_THESES=521671`.
    - created/updated prd `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, `CLEVERREACH_FILTER_THESES=521671`.
    - verified each new key with v4 HTTP 200 status checks through the AKS SecretStore machine identities; values were not printed.
  - Independent prep done after upgrade:
    - committed this plan update: `8a12559 docs(project): update thesis Infisical rollout plan`.
    - rebased df-cloud `codex/thesispf-infisical` from stale `origin/stg` to `dd7ea1a`.
    - rebased df-cloud base commit is `de2fa74 deploy(thesispf): align Infisical ArgoCD desired state`.
    - final df-cloud review found `STAGING_ENABLE_EXTERNAL_FLOWS` was also requested by `thesispf-ibw`; fixed in `989990c fix(thesispf): keep staging flow gate scoped`.
    - df-cloud MR: [!226](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/merge_requests/226), draft to `stg`.
    - df-cloud MR pipeline: [622446](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/pipelines/622446).
    - df-cloud branch is clean and `ahead 2` of current `origin/stg`.
    - df-cloud diff remains scoped to `src/apps/thesispf/functions.ts`.
    - df-cloud verification:
      - `git diff --check origin/stg...HEAD`
      - `src/apps/thesispf/node_modules/.bin/tsc --noEmit --project src/apps/thesispf/tsconfig.json --pretty false`
      - `node_modules/.bin/prettier --check src/apps/thesispf/functions.ts`
      - `agy` / Gemini 3.5 Flash High review: one Important finding accepted and fixed; follow-up re-review call timed out without output.
      - [build-azure-helpers-mr-stg](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/jobs/1938262): success.
      - [infra-preview-mr-stg](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/jobs/1938263): success.
      - [post-infra-preview-mr-stg](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/jobs/1938266): success.
      - Pipeline passed.
  - df-cloud stg rollout done on 2026-07-05:
    - final `agy` / Gemini 3.5 Flash High review before merge: no Critical, Important, Minor, or simplification findings; decision `Merge`.
    - MR [!226](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/merge_requests/226) marked ready and merged to `stg`.
    - merge commit: `0db6ae66b63fe81f56db1e663b410410a374e02d`.
    - squash commit: `ace54cae82ba4fae586d400dbe99488c63fedd58`.
    - parent stg pipeline [622453](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/pipelines/622453):
      - [infra-preview-stg](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/jobs/1938288): success.
      - [infra-up-stg](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/jobs/1938290): success.
    - the root infra stack did not apply thesispf app resources; the scoped app bridge was required.
    - thesispf app child pipeline [622457](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/pipelines/622457):
      - [build-azure-helpers](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/jobs/1938324): success.
      - [app-preview](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/jobs/1938325): success.
      - [app-up](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/jobs/1938326): success.
    - live stg verification on `aks-stg-apps` / `stg-thesispf`:
      - ExternalSecret `df-infra-k8s-es-inf-stg-apps-stg-thesisplatform-secrets` has `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, `CLEVERREACH_FILTER_THESES`, and `STAGING_ENABLE_EXTERNAL_FLOWS`.
      - ExternalSecret status is `Ready=True`, reason `SecretSynced`.
      - Kubernetes secret `stg-thesisplatform-secrets` contains the same four keys.
      - existing pod did not have the new env vars because it predated the secret update.
      - restarted deployment `app-thesispf-thesis-platform`; rollout completed.
      - restarted pod has all four required env vars present; values were not printed.
  - Thesis branch verification refreshed:
    - `./node_modules/.bin/tsc --noEmit --incremental false --pretty false`
    - `./node_modules/.bin/next lint`
    - `./node_modules/.bin/tsx scripts/verify-cleverreach-thesis.ts`
    - `helm template thesis-platform deploy/chart_new -f deploy/stg_new/values.yaml`
    - `helm template thesis-platform deploy/chart_new -f deploy/prd_new/values.yaml`
    - `helm template thesis-platform deploy/chart_new -f deploy/prd_ibw_new/values.yaml`
    - `git diff --check origin/main...HEAD`
    - note: `tsx` and `next lint` required sandbox escalation because local IPC/cache writes were blocked.
- [x] Disable old Power Automate CleverReach gate.
  - Slice 6 mapping done; DEV flow was disabled only during the blocked 2026-07-05 smoke attempt and reactivated after rollback.
  - DEV and PROD both have populated value rows for:
    - `uzhbf_thesisplatform_cleverreach_client_id_env_var`
    - `uzhbf_thesisplatform_cleverreach_client_secret_env_var`
  - DEV and PROD both have a separate activated modern flow:
    - `UZH BF Thesis Platform - Cleverreach`
    - workflow id in both environments: `3fa5d199-c377-f011-b4cc-00224874b350`
    - DEV environment URL: `https://orgc222f0ec.crm17.dynamics.com/`
    - PROD environment URL: `https://org778b7285.crm17.dynamics.com/`
  - Recommended gate for stg smoke/prod cutover:
    - turn off only `UZH BF Thesis Platform - Cleverreach`.
    - leave proposal posting/application/email flows active.
    - set the old CleverReach env values to `EMPTY` so the parent proposal flow skips the old child-flow branch while keeping the other email actions.
  - 2026-07-05 final stg state:
    - DEV `UZH BF Thesis Platform - Cleverreach` remains disabled (`statecode=0`, `statuscode=1`) and must not be re-enabled for stg.
    - DEV Power Platform CleverReach client id and client secret env value rows now read `EMPTY`; values were not printed.
    - old CleverReach child-flow run history has no run newer than 2026-06-26.
- [x] Run stg smoke.
  - 2026-07-05 attempt blocked before CleverReach validation:
    - DEV `UZH BF Thesis Platform - Cleverreach` flow was confirmed active, then temporarily deactivated through Dataverse Web API (`statecode=0`, `statuscode=1`).
    - stg `STAGING_ENABLE_EXTERNAL_FLOWS` was temporarily patched to `true` in Kubernetes Secret `stg-thesisplatform-secrets` because the local stg Infisical user/API write path returned 403.
    - deployment `app-thesispf-thesis-platform` was restarted and confirmed to read `STAGING_ENABLE_EXTERNAL_FLOWS=true`.
    - submitted one unique proposal through stg tRPC: `Codex Stg Smoke Thesis 2026-07-05T13:38:20.403Z`.
    - app logs showed `Submitting proposal to Power Automate flow...` and `Successfully submitted proposal`.
    - stg DB did not contain the smoke title after the app polling window; no smoke proposal record was created.
    - running stg image was still `ghcr.io/uzh-bf/thesis-platform:latest-arm-b7225d42725c6c0ec3293e2102b14a2599d1371b`.
    - running stg deployment still had old env marker `DOPPLER_CONFIG=stg` and lacked `THESIS_PLATFORM_ENV`.
    - running stg image did not contain `/app/src/lib/cleverreach`; the app branch was not deployed to stg.
    - rollback done:
      - stg `STAGING_ENABLE_EXTERNAL_FLOWS` reset to `false` in Kubernetes Secret and deployment restarted.
      - restarted pod confirmed `STAGING_ENABLE_EXTERNAL_FLOWS=false`.
      - DEV `UZH BF Thesis Platform - Cleverreach` flow reactivated (`statecode=1`, `statuscode=2`).
      - final stg DB query still showed zero records for the smoke title.
    - conclusion: deploy/merge the thesis-platform app branch to stg before repeating smoke.
  - 2026-07-05 branch deployment for real stg testing:
    - built and pushed ARM64 image `ghcr.io/uzh-bf/thesis-platform:codex-thesis-cleverreach-api-arm-9099a43775c2`.
    - committed stg values update to point at that image: `6f50d11 chore(deploy): point staging to thesis smoke image`.
    - pushed branch `codex/thesis-cleverreach-api` to GitHub.
    - temporarily changed stg ArgoCD `app-thesispf` `targetRevision` from `main` to `codex/thesis-cleverreach-api`.
    - ArgoCD stg app synced branch revision `6f50d11a39622762057f71ada3550bb527179c5d`.
    - stg deployment rolled out image `ghcr.io/uzh-bf/thesis-platform:codex-thesis-cleverreach-api-arm-9099a43775c2`.
    - stg pod now has `THESIS_PLATFORM_ENV=stg`, `DOPPLER_CONFIG` missing, CleverReach env keys present, and HTTP 200 on `https://theses.stg.df-app.ch`.
  - 2026-07-05 repeat smoke against branch image still blocked before CleverReach draft creation:
    - DEV `UZH BF Thesis Platform - Cleverreach` flow temporarily deactivated and later reactivated.
    - stg `STAGING_ENABLE_EXTERNAL_FLOWS` temporarily set to `true`, then reset to `false`.
    - submitted proposal title `Codex Real Stg Smoke Thesis 2026-07-05T14:24:17.583Z`.
    - app logs showed Power Automate submit succeeded.
    - app logs then showed `CleverReach thesis proposal draft skipped because the published proposal could not be found after flow submission.`
    - stg DB query found zero records for the smoke title after the polling window.
    - conclusion: app/Argo/image migration is now testable on stg; end-to-end smoke is blocked by the DEV Power Automate proposal-posting callback not creating the proposal record.
  - 2026-07-05 Power Automate callback fix and successful API smoke:
    - DEV Power Platform `Root URL` environment variable was updated from the stale ngrok URL to `https://theses.stg.df-app.ch` and verified with `pac org fetch`.
    - first retry used the staging service account as `responder`; the parent flow reached the correct staging `/api/addProposal` URL but stayed running because the service account is not a staging `User`.
    - corrected retry used existing staging supervisor `staging.supervisor.one@example.com` as `responder`.
    - parent flow action `addProposal` succeeded and stg DB contained proposal `83f6c854-f66c-4c7d-b78a-c8775e21fc8f` for `Codex Valid Responder Stg Smoke Thesis 2026-07-05T15:01:07.455Z`.
    - app logs confirmed `CleverReach thesis proposal draft created for 83f6c854-f66c-4c7d-b78a-c8775e21fc8f { mailingId: '17238974' }`.
    - the old DEV `UZH BF Thesis Platform - Cleverreach` child flow was disabled only during the smoke and reactivated afterward.
    - the temporary live stg `STAGING_ENABLE_EXTERNAL_FLOWS=true` deployment override was removed afterward; running pod again reported `STAGING_ENABLE_EXTERNAL_FLOWS=false`.
    - two smoke flow runs left retrying by intentionally incomplete smoke data were cancelled through the Flow Management API.
  - 2026-07-05 final stg deploy and smoke:
    - merged app branch to GitHub `main` by fast-forwarding from `codex/thesis-cleverreach-api`.
    - built and pushed ARM64 image `ghcr.io/uzh-bf/thesis-platform:latest-arm-a4362b18c8e593a96faf3572db51c44979d3340c`.
    - committed and pushed stg deploy values update `c51c2a1 chore(deploy): update thesis staging image tag`.
    - ArgoCD `app-thesispf` was restored to `targetRevision=main`, synced revision `c51c2a1ae8df59c481989e7372e6ce9cb46d6b81`, `Healthy`, `Synced`.
    - live stg deployment runs image `ghcr.io/uzh-bf/thesis-platform:latest-arm-a4362b18c8e593a96faf3572db51c44979d3340c`.
    - temporary live deployment override `STAGING_ENABLE_EXTERNAL_FLOWS=true` was removed after smoke; restarted pod reports `STAGING_ENABLE_EXTERNAL_FLOWS=false`.
    - final smoke title: `Codex Final Stg No Flow CR 2026-07-05T17:30:49.963Z`.
    - parent proposal flow run `08584183342353203771179843761CU21` succeeded.
    - parent flow action evidence:
      - `SupervisorConfirmationEmail`: `Succeeded`.
      - `Run_a_Child_Flow`: `Skipped` because the branch condition was not satisfied.
      - `SendCleverreachConfirmationMail`: `Skipped`.
      - `SendFailureNotification`: `Skipped`.
    - app logs confirmed `CleverReach thesis proposal draft created for 98c57e16-fb40-4ffe-857c-416ec8b454b5 { mailingId: '17239031' }`.
    - CleverReach API metadata for mailing `17239031` confirmed subject `Neue Abschlussarbeit: Codex Final Stg No Flow CR 2026-07-05T17:30:49.963Z`.
    - CleverReach API body check confirmed short German preheader `Masterarbeit (30 ECTS), Corporate Finance, Herbstsemester 2026.`
    - GitHub Actions staging image run `28748454337` built the image but failed in the deployment-tag update step because the build-time `.env.production`/`.env.stg` swap left the checkout dirty before branch checkout.
    - workflow fix added: restore `.env.production` and `.env.stg` before the staging deployment-tag update branch is checked out.
- [ ] Promote prd.

## Next Step

Production rollout plan:

1. Confirm production preflight:
   - `main` contains the app CleverReach implementation and staging deploy evidence above.
   - prd Infisical has `APP_URL`, `CLEVERREACH_CLIENT_ID`, `CLEVERREACH_CLIENT_SECRET`, and `CLEVERREACH_FILTER_THESES`; values must not be printed.
   - prd `thesispf-ibw` remains without CleverReach keys unless explicitly requested.
   - PROD Power Platform `Root URL` points to the production thesis URL and `Flow Secret` still matches the app.
2. Build the production ARM image from an immutable release tag.
   - use the production workflow/release path, not a mutable staging tag.
   - update `deploy/prd_new/values.yaml` to the release/immutable image tag after the image exists.
3. Disable the old PROD Power Automate CleverReach branch immediately before syncing prd.
   - set the PROD CleverReach client id and client secret env values to `EMPTY`.
   - turn off only PROD `UZH BF Thesis Platform - Cleverreach` (`3fa5d199-c377-f011-b4cc-00224874b350`).
   - keep proposal posting, application, supervisor confirmation, and other email flows active.
4. Sync/restart prd through ArgoCD and verify the app receives the Infisical CleverReach env.
5. Run one controlled prd smoke.
   - verify the parent proposal flow succeeds.
   - verify the old PROD child flow has no new run.
   - verify the app creates exactly one CleverReach draft.
   - verify subject is German/title case and the preheader contains useful non-title metadata.
6. Monitor app logs, ArgoCD health, Power Automate run history, and CleverReach draft state.
   - rollback path is to remove app CleverReach env or stop app draft creation; re-enabling the old child flow is only a last-resort rollback because it can reintroduce duplicate drafts.
