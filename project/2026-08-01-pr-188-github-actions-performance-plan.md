# GitHub Actions Performance and Feedback Plan (PR #188)

Date: 2026-08-01
Status: Slices 1–2 and 4 implemented; Bake benchmark complete and rejected by the adoption gate; static checks pass; native Docker proof, representative PR validation, and hosted staging validation pending; SOL high plan review complete
Branch: `rs/github-actions-performance-plan`
Target branch: `main`
PR: https://github.com/uzh-bf/thesis-platform/pull/188
Base checked: `origin/main` at `09ab3bff6abd1a5e411e697dc3b898ad68a6d894`

## Goal

Make the GitHub Actions path faster and more useful without weakening release
or deployment safety:

- keep native ARM64 image builds;
- make staging converge on the newest eligible commit rather than completing
  obsolete image builds;
- remove unnecessary Docker build context;
- add safe, cached pull-request validation before changes reach `main`; and
- measure whether a shared Buildx Bake invocation can shorten the remaining
  sequential app-plus-migration build critical path.

## Non-Goals

- Do not reintroduce GitHub Actions BuildKit cache export/import by default.
- Do not change the production `release-production` concurrency policy,
  release trigger, image tags, deployment environment, or deployment token.
- Do not change application functionality, Docker runtime targets, deployment
  manifests, secrets, or production resource settings.
- Do not run a synthetic production release or a live staging deployment merely
  to benchmark this work.
- Do not make Playwright E2E a required PR check until its CI environment and
  cost have been proved separately.
- Do not add self-hosted runners, Docker Build Cloud, or a registry cache in
  this iteration. Those introduce ownership or cost that has not been justified.

## Verified Starting State

The current source contains only these checked-in workflows:

| Workflow | Current role | Runner and concurrency | Observed state |
| --- | --- | --- | --- |
| `.github/workflows/docker-image-stg-arm.yml` | Builds and pushes staging app and migration images, then updates `deploy/stg_new/values.yaml`. | `ubuntu-24.04-arm`; one `build-staging-arm-${{ github.ref }}` group; `cancel-in-progress: false`. | The 2026-07-29 successful run took 2m34: app image 78s and migration image 60s. |
| `.github/workflows/docker-image-prd.yml` | Release-only DF and IBW ARM image builds, then production deploy and GitHub release jobs. | Both build jobs use `ubuntu-24.04-arm`; `release-production` is serialized with `cancel-in-progress: false`. | The 2026-07-29 release took 4m40. DF app and migration builds were serial (2m12 + 1m57); IBW built in parallel (1m48). |

The live configuration already has the correct high-value choices:

- ARM images run on native GitHub ARM runners, not QEMU.
- Production variants fan out in parallel and only deployment/release wait for
  both images.
- The Dockerfile isolates dependency installation before `COPY . .`, including
  `pnpm-workspace.yaml` and `patches/`.
- No `cache-from` or `cache-to` input is present. This is intentional: previous
  measurements found a 182-second GHA cache export and a 27-second restore for
  a 257 MB layer, while a cold dependency install took about 10 seconds.
- Staging already ignores documentation-only and deployment-values-only pushes.

The gaps to address are therefore latest-wins staging execution, Docker context
size, early PR feedback, and evidence for (not an assumption about) a shared
app/migration Buildx build.

## Decisions and Approval Gates

| Decision | Recommendation | Why it needs a ruling | Default in this plan |
| --- | --- | --- | --- |
| Cancel an in-progress staging build when a newer eligible `main` push arrives | Approve `cancel-in-progress: true` for staging only, with an API-backed freshness guard before the deployment-values commit and push. | Cancellation alone is cooperative: an older run can otherwise win a late push. The guard makes a stale run exit without changing desired state. | Planned, but do not merge this slice without explicit approval. |
| Replace the two sequential DF Buildx calls with Bake | Benchmark first; adopt only when the median critical path improves by at least 20% without increasing median runner time by more than 10%. | It adds a build definition and changes an already fast, working image path. The existing IBW job remains independent and parallel. | Experimental slice; omit from the delivery branch if the threshold is not met. |
| Required PR checks | Require lint, application build, and non-pushing native-ARM Docker target checks after they are green on representative PRs. | Branch protection changes forge policy and can block contributors. | Implement the workflow; change branch protection only with explicit approval. |
| E2E in CI | Keep out of the required PR gate for now. | The current Playwright suite needs a browser plus local Postgres, Azurite, and OIDC services; its runtime and reliability have not been measured in Actions. | Record a separately scoped follow-up only. |

The production release concurrency group remains deliberately non-cancellable:
its jobs publish immutable images and update production desired state. No staging
concurrency group may overlap or share a name with it.

## Success Measures

Capture the following from Actions for every qualifying run: queued time
(`run_started_at - created_at`), job time, app-image step time, migration-image
step time, conclusion, and whether a deployment-values commit was made.

| Measure | Baseline | Acceptance rule |
| --- | --- | --- |
| Staging stale work | Running builds are not cancelled; a burst can wait behind an obsolete build. | A newer eligible push cancels the prior staging run. After the burst is quiescent, the values file and mutable app/migration aliases resolve to the newest eligible SHA; a stale run exits before its desired-state push. |
| Staging build critical path | 2m34 in the latest verified successful run. | No more than 10% slower after the safe context/concurrency changes. |
| Buildx shared-target experiment | DF release path: 2m12 app + 1m57 migration serially. | Adopt only if three paired, same-input native-ARM comparisons show a median critical-path reduction of at least 20%, no more than 10% median runner-time increase, and no image or migration regression. |
| PR feedback | No checked-in `pull_request` quality workflow. | A PR receives independent lint, app-build, and non-pushing ARM image validation results without registry or deployment credentials. |

Use at least five normal staging runs after merge for the staging metrics. Do not
manufacture a release to collect production timing; inspect the next real release
instead.

## Current Evidence

- 2026-08-01 baseline: `pnpm install --frozen-lockfile` completed with pnpm
  11.9.0 and the lockfile's 1,168-entry supply-chain check passed.
- 2026-08-01 baseline: `pnpm lint` exited 0 with eight existing React hook
  warnings and no errors. The local `pnpm build` generated Prisma successfully
  but was interrupted after more than five minutes without further output; it
  is not treated as a passing build.
- 2026-08-01 environment limit: the local Docker client cannot access the
  OrbStack socket, so ARM image builds and Docker context measurements require
  the hosted workflow path. No image or deployment was published from this
  checkout.
- 2026-08-01 disposable Bake proof: `docker buildx bake --check` and
  `docker buildx bake --print` passed locally after granting the host-only
  `/private/tmp` diagnostic entitlement; the actual native target build stayed
  on the hosted ARM path. Three qualifying paired hosted rounds completed with
  the same commit, public build arguments, targets, platform, Buildx driver,
  and cache-only output:

  | Round | Sequential critical path / job seconds | Bake critical path / job seconds |
  | --- | --- | --- |
  | 1 (`30697024935`) | 68 / 83 (`91361534388`) | 63 / 77 (`91361534425`) |
  | 2 (`30697113606`) | 68 / 82 (`91361745882`) | 63 / 76 (`91361745868`) |
  | 3 (`30697177421`) | 63 / 77 (`91361913593`) | 63 / 84 (`91361913637`) |
  | Median | **68 / 82** | **63 / 77** |

  Bake therefore reduced median critical path by 7.4% and median runner time by
  6.1%, below the required 20% critical-path improvement; both targets did
  complete successfully. Bake is rejected for this delivery and the diagnostic
  branch/workflow will be removed.
- 2026-08-01 Slice 4 static proof: `validate.yml` parses as YAML, its actions are
  pinned to 40-character commits, both jobs use only `contents: read`, both
  checkouts disable persisted credentials, the pnpm cache is lockfile-scoped,
  and the quality and native-ARM image jobs have no dependency edge between
  them. Native target execution and same-repository/fork cache behavior remain
  hosted-PR checks.

## Slice 0 — Establish a Reproducible Baseline

Purpose: turn the observed timing into a reviewable before/after record without
creating infrastructure or deploying anything.

Do:

- Add a short `Current evidence` and `Progress` section to this plan when work
  starts, preserving the exact run URLs, source SHA, and timing fields.
- Verify the current source still uses `ubuntu-24.04-arm` in all three ARM build
  jobs and has no QEMU or external cache configuration.
- Read the Docker build summaries for the two image steps where access permits.
  Distinguish a BuildKit cache hit from a fast cold install; do not infer cache
  behavior from a green workflow alone.
- Record the current app/migration timing separately because only the DF job is
  on the release critical path.

Check:

- `git show origin/main:.github/workflows/docker-image-stg-arm.yml`
- `git show origin/main:.github/workflows/docker-image-prd.yml`
- GitHub Actions run/job timings for the most recent successful staging run and
  the next normal release.

Stop condition:

- If current timing or workflow ownership has materially changed since this
  plan, update the plan and repeat review before changing the implementation.

## Slice 1 — Latest-Wins Staging Concurrency

Files:

- `.github/workflows/docker-image-stg-arm.yml`

Do:

- Change the staging workflow-level concurrency setting to
  `cancel-in-progress: true` and retain its current branch-scoped group.
- Keep the existing group `build-staging-arm-${{ github.ref }}` so cancellation
  is scoped to one staging branch, not to production, release, PR validation,
  or unrelated workflows.
- Add `actions: read` to this job's existing least-privilege permissions so its
  own `GITHUB_TOKEN` can query the staging workflow's push runs. Keep
  `contents: read` and `packages: write`; use `DEPLOY_PUSH_TOKEN` only for the
  existing authenticated deployment-values push.
- Add an inline freshness helper in the deployment-values step, with the
  source-selection portion exercised locally against recorded API JSON fixtures.
  It must identify the newest *eligible* staging source SHA from this workflow's
  `push` runs on `main` (not `workflow_dispatch`, and excluding the existing
  `chore(release)` / `chore(deploy)` job-skip cases). The query is the authority
  for the current trigger and path-ignore policy; it must be bounded, retry on
  transient API lag, and fail closed without a values-file push if it cannot
  establish freshness.
- Before modifying `deploy/stg_new/values.yaml`, compare that eligible SHA with
  `github.sha`. If they differ, log a clear `stale source` message and exit
  successfully without making a deployment commit. Do not delete any immutable
  image tag already published by the cancelled or stale build.
- Start each deployment attempt from a freshly fetched `origin/main`, regenerate
  the values-file change there, re-check freshness immediately before `git
  push`, and use only a normal fast-forward push. That push is the optimistic
  compare-and-swap: never force-push a deployment commit.
- If another main commit makes the push non-fast-forward, fetch again and retry
  the whole freshness check and values-file generation only while `github.sha`
  remains the newest eligible source SHA. Otherwise exit as stale. Cap retries
  and surface an actionable error rather than silently looping.
- Preserve the current `main` guard, path exclusions, native ARM runner,
  `linux/arm64` output, image tags, registry permissions, and deployment-values
  semantics. Add a concise comment explaining the staging-only latest-wins
  policy and the pre-push freshness guard.

Why this is safe:

- Cancellation is cooperative, so it is an efficiency mechanism rather than the
  correctness mechanism. A run may still finish publishing immutable SHA tags.
  The freshness check plus fast-forward-only push prevents a run known to be
  stale from changing desired state, and a rejected push is recomputed only for
  the still-current source SHA.
- A source push that arrives between the final freshness check and a successful
  push can transiently leave an older desired-state commit. Its newer eligible
  run is then the only run permitted to converge desired state. The acceptance
  criterion is therefore measured after all affected runs are terminal, not
  during a cancellation signal race.
- Existing deploy commits remain excluded by the job condition, preventing a
  workflow loop.

Verification:

- Parse the changed workflow and inspect its rendered `concurrency` block.
- Exercise the source-selection portion against recorded API fixtures for:
  current source, newer eligible source, a manual run, excluded release/deploy
  commits, transient API delay, and a push conflict. Run `shellcheck` if
  available.
- Create a burst of at least three qualifying non-release commits only after the
  user approves staging resource use. Confirm older runs are cancelled or exit
  stale, the final eligible run succeeds, and after all runs are terminal
  `deploy/stg_new/values.yaml` points to the newest SHA-specific app and
  migration tags.
- Inspect `main-arm`, `latest-arm`, `migration-main-arm`, and
  `migration-latest-arm` with `docker buildx imagetools inspect`; after the same
  quiescent burst, each mutable alias must resolve to the newest eligible SHA's
  ARM manifest. Record any transient stale immutable tag as expected evidence,
  not a deployment failure.
- Exercise a non-fast-forward retry with a harmless concurrent main update in an
  approved staging validation window. Confirm the older run either regenerates
  against current `main` while still fresh or exits stale; it must never
  force-push or overwrite a newer main commit.
- Confirm a release workflow remains unaffected and retains
  `release-production` with `cancel-in-progress: false`.

Rollback:

- Revert the concurrency and freshness-helper change together if it blocks a
  valid staging deployment. No registry or deployment cleanup is required; SHA
  tags are immutable build artifacts.

Commit:

- `ci(staging): converge ARM deploys on newest source`

## Slice 2 — Reduce Docker Build Context Safely

Files:

- `.dockerignore`

Do:

- Inspect every candidate path for build-time references before excluding it.
- Add only paths already classified as non-runtime by the staging trigger and
  not consumed by the Dockerfile or Next build: `.agents/`, `.claude/`,
  `.vscode/`, `backups/`, `bruno/`, `docs/`, `project/`, `solutions/`, `LICENSE`,
  and the verified non-runtime root Markdown files `CHANGELOG.md`, `README.md`,
  and `UPGRADE_NOTES.md`.
- Do not exclude `.env.production`, `.env.stg`, `.env.stage`, `public/`,
  `prisma/`, `patches/`, build configuration, or any package-manager input. Keep
  the existing `Dockerfile` exclusion: the build action supplies that file
  separately while it builds from the context.
- Keep the current dependency-layer order in the Dockerfile unchanged. This
  slice is a context reduction, not a cache redesign.

Verification:

- Search the source and build configuration for every excluded path before
  editing `.dockerignore`.
- Compare Docker context transfer size before and after using a local native-ARM
  `docker buildx build --progress=plain` when a Docker daemon is available.
- Build both `app` and `migration-runner` targets without a registry push;
  `pnpm run build` and Prisma migration tooling must remain present in their
  respective targets.
- Confirm a documentation-only change continues not to trigger staging.

Rollback:

- Remove only the offending ignore pattern and rebuild the affected target.

Commit:

- `build(docker): reduce irrelevant build context`

## Slice 3 — Prove or Reject a Shared Buildx Bake Path

Benchmark-only files (disposable; never part of the delivery PR):

- a branch-local diagnostic workflow under `.github/workflows/`, removed after
  its three paired rounds; or an equivalent manually dispatched job in a
  disposable benchmark branch

Files, only if the benchmark passes and Bake is adopted:

- `docker-bake.hcl` (new)
- `.github/workflows/docker-image-stg-arm.yml`
- `.github/workflows/docker-image-prd.yml`

Hypothesis:

The DF app image and migration image share the `base` and `deps` stages, but the
workflow invokes `docker/build-push-action` twice. A single Buildx Bake
invocation can execute multiple targets concurrently and let BuildKit deduplicate
their common graph. It might shorten the release critical path; it must be
measured rather than assumed.

Experiment design:

- Scope Bake to the existing `build-prd-arm` DF job and the equivalent staging
  job only: one Bake invocation may build the DF app and DF migration targets
  that currently run sequentially on the same ARM runner. Do **not** combine
  them with IBW. `build-prd-ibw-arm` remains a separate native-ARM job with its
  existing independent failure boundary and production parallelism.
- Define a minimal `docker-bake.hcl` with a common DF target and separate
  `df-app` and `df-migration` targets. Parameters cover the image repository,
  immutable and mutable tags, Docker target, platform, labels, and existing
  public build arguments. Keep target names explicitly mapped to the current
  Dockerfile (`app` and `migration-runner`).
- Preserve the current production job IDs, `needs` graph, `linux/arm64`, push
  behavior, Docker labels, image repositories, and SHA-specific tag calculation.
  Bake replaces only the two serial DF invocations inside their existing job;
  it does not create a cross-runner builder or alter the production deploy and
  GitHub-release jobs.
- Create a disposable, non-pushing diagnostic workflow or branch-only job for
  the benchmark. It runs `mode: sequential` and `mode: bake` in separate clean
  `ubuntu-24.04-arm` jobs against the same commit, Dockerfile, target pair,
  platform, public build arguments, Buildx driver, and output mode. Disable
  external BuildKit cache import/export in both modes; neither mode logs in or
  publishes an image.
- Before manually dispatching any benchmark round, state its expected hosted
  ARM-runner use in chat and obtain approval. It has no registry, deployment,
  or production side effect, but it still consumes CI capacity.
- Run three paired benchmark rounds. For each round record (1) critical-path
  seconds from the first DF build invocation to the final app-or-migration
  completion, (2) whole-job runner seconds from job start to completion, and
  (3) the sum of individual build-step seconds. Compare medians only between
  the paired modes; do not compare a non-pushing diagnostic build with a
  historical pushed release.
- Use `docker buildx bake --check` to validate the definition before running it.
- Do not use Docker Build Cloud, self-hosted runners, `cache-to`, or
  `cache-from` in this experiment. Those are separate architecture decisions.

Adoption gate:

- Keep Bake only if its paired median critical path is at least 20% lower and
  paired median whole-job runner time is no more than 10% higher. The benchmark
  must also show both targets complete, preserve the required build arguments,
  and leave a simple rollback to the two explicit calls.
- If the result is neutral or worse, remove the disposable diagnostic workflow
  or branch and retain the two explicit build steps. Document the measured
  result in this plan; do not leave an experimental workflow in the delivery
  branch or PR.

Verification when adopted:

- `docker buildx bake --check`
- Paired native-ARM non-pushing builds of the DF `app` and `migration-runner`
  targets with the recorded benchmark measures
- On the next ordinary staging run and next ordinary release after adoption,
  use `docker buildx imagetools inspect` for published DF and DF migration
  SHA-specific ARM tags; inspect IBW's existing SHA-specific tag on the ordinary
  release as a non-regression check.
- Confirm the production deployment and GitHub-release jobs still wait for the
  unchanged two build jobs and that IBW remains parallel to the DF build job.

Commit, only when adopted:

- `build(docker): share ARM image build graph`

## Slice 4 — Add Pull-Request Quality and Image Validation

Files:

- `.github/workflows/validate.yml` (new)

Do:

- Add a `pull_request` workflow targeting `main`, plus `workflow_dispatch` for
  repeatable diagnostics. It must use a per-PR latest-wins concurrency group:
  `${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}`
  with `cancel-in-progress: true`.
- Use only `pull_request`, never `pull_request_target`. Grant only
  `contents: read`; do not log into GHCR, request package write permission,
  read deployment secrets, or update deployment values.
- Add a `quality` job on `ubuntu-24.04` that:
  1. checks out with the repository's pinned `actions/checkout` revision and
     `persist-credentials: false`;
  2. sets up pnpm `11.9.0` with a pinned `pnpm/action-setup` revision before
     requesting the pnpm store cache;
  3. installs Node `24.18.0` and uses `actions/setup-node`'s pnpm store cache
     keyed by `pnpm-lock.yaml`, matching the committed `packageManager` and
     `engines` contract;
  4. runs `pnpm install --frozen-lockfile`, `pnpm lint`, and `pnpm build`.
- Add a parallel `image-targets` job on `ubuntu-24.04-arm` that builds the
  `app` and `migration-runner` targets without `push: true` and without public
  staging/production build arguments. Its checkout also sets
  `persist-credentials: false`. It validates the actual native image path while
  remaining side-effect-free.
- If Slice 3 is adopted, use the same Bake definition in the image job; if not,
  keep the job's Docker commands explicit and small.
- Do not add E2E to this workflow. Create a follow-up proposal after measuring
  a CI run with Postgres, Azurite, OIDC, and Playwright browser setup.

Why this cache differs from the rejected Docker cache:

- `actions/setup-node` caches the pnpm store for a host-side lint/build job.
- The Docker cache experiment stored a large BuildKit layer remotely and was
  empirically slower than a native cold install. The two caches have different
  data, ownership, and performance characteristics.
- A fork can restore a cache scoped for PR use, so treat every restored package
  artifact as untrusted input. Cache only the pnpm store; never cache
  `node_modules`, credentials, Docker state, or generated deployment material.
  The unprivileged `pull_request` token and disabled persisted checkout
  credential ensure fork code cannot write back through this workflow.

Verification:

- YAML parse and workflow syntax review.
- A same-repository PR and a fork PR both run without secrets and complete the
  two jobs. Verify the repository's fork-workflow approval policy and record
  any maintainer approval required by GitHub as an external policy gate, not a
  workflow failure.
- Confirm the cache key changes when `pnpm-lock.yaml` changes and restores only
  the pnpm store, not `node_modules`; inspect the Actions cache restore/save
  log to confirm no privileged cache is reused.
- Intentionally introduce one lint error and one Docker-context/target error in
  disposable commits to show that each job fails for the intended reason.
- After several green PRs, obtain explicit approval before configuring either
  result as a required GitHub branch-protection check.

Commit:

- `ci(validation): add pull request quality gates`

## Slice 5 — Rollout, Observation, and Documentation

Do:

- Execute and commit the implementation slices in dependency order on one
  implementation branch: Slice 1, Slice 2, optional accepted Slice 3, then
  Slice 4. Before implementation begins, refresh the branch from current
  `main` and carry this plan forward on that same branch. Keep each commit
  independently green and reviewable, but open only one PR containing this plan
  and all approved implementation changes. The current plan-review commit is a
  review artifact, not a plan-only PR. Do not publish a plan-only or per-slice
  PR, and do not merge a partial delivery.
- Run the Bake diagnostic only in its disposable benchmark branch. If it meets
  the adoption gate, recreate the accepted Bake changes on the implementation
  branch and include them in the one delivery PR. If it misses the gate, remove
  the diagnostic workflow/branch and record its evidence in this plan without
  including experimental workflow or Docker changes in the PR.
- Before any staging run that publishes images or updates desired state, state
  the expected resource and deployment effect in chat and obtain approval.
- Before triggering a non-pushing hosted-ARM benchmark or validation run, state
  its CI-capacity effect in chat and obtain approval; static workflow review and
  local validation remain safe without it.
- Observe at least five normal staging runs after Slice 1/2. Record timing,
  cancellation behavior, SHA tag, and desired-state result in this plan's
  `Progress` section.
- Observe the next ordinary release only; confirm ARM manifests, release
  creation, production serialization, and the deployment job remain correct.
- Update the repository's CI documentation only with verified facts. Do not
  claim a cache or Bake win before the required measurements exist.

Finish criteria:

- Native ARM runners remain in all ARM build jobs.
- After a quiescent commit burst, staging values and all four mutable DF image
  aliases resolve to the latest eligible SHA. A stale run has an observable
  pre-push exit or a bounded retry; any unavoidable transient publishing race is
  recorded and assessed rather than hidden.
- Docker context excludes only verified non-build inputs.
- PRs receive safe quality and image-target feedback before merge.
- No production release/deployment behavior, secrets, or runner ownership was
  widened.
- Bake is either adopted with measured success or explicitly rejected with the
  measured evidence preserved.

## Review and Test Matrix

| Change | Local/static proof | GitHub Actions proof | Live approval required |
| --- | --- | --- | --- |
| Staging cancellation and freshness | YAML/diff review; source-selection fixtures; group is staging-only; no force-push path | A three-commit burst shows cancellation/stale exits then newest values and four mutable aliases | Yes: image publication and staging desired-state update |
| `.dockerignore` | Reference inventory; native target builds; context-size comparison | Next normal staging build | Yes for the normal staging deployment, not for local target builds |
| Bake experiment | `docker buildx bake --check`; paired same-input non-pushing target builds | Three paired native-ARM diagnostic rounds; normal staging/release only after adoption | Yes: hosted ARM benchmark capacity; yes before any staging publish |
| PR validation | Workflow YAML, `persist-credentials: false`, and least-privilege/cache review | Same-repo and fork PR runs | Yes before hosted ARM validation runs; branch-protection activation needs separate approval |
| Production regression check | Workflow diff confirms no release-concurrency/runner/tag change | Next ordinary release succeeds | Do not create a synthetic release |

## Progress

- 2026-08-01: Plan drafted from live `origin/main` at `09ab3bf` after a runner,
  cache, timing, concurrency, Dockerfile, and workflow-trigger audit.
- 2026-08-01: First SOL high review tightened stale-run convergence, Bake scope
  and comparison design, fork-safe checkout/caching, and the single-PR delivery
  path. The final SOL high re-review found no unresolved P0–P3 findings.
- 2026-08-01: Slice 0 baseline captured; implementation starts with the
  staging freshness/concurrency slice. Local build limitation remains recorded
  above, and hosted ARM validation is still required.
- 2026-08-01: Slice 1 in progress: latest-wins staging cancellation plus a
  bounded Actions-run freshness check and fast-forward-only desired-state push.
- 2026-08-01: Slice 1 review found and fixed two shell defects: the migration
  fallback now uses the exported tag, and freshness API failures now fail
  closed instead of being reported as stale success. Static YAML, Bash, and
  fixture checks pass; hosted staging burst validation remains gated.
- 2026-08-01: Slice 1 complete; next is verified Docker build-context reduction.
- 2026-08-01: Slice 2 in progress: narrow `.dockerignore` additions are being
  checked against Dockerfile, Next.js, Prisma, and package-manager inputs.
- 2026-08-01: Slice 2 review caught a blanket Markdown glob that could remove
  runtime assets; it was replaced with three verified non-runtime root files.
  Required runtime inputs remain unignored, and native Docker target/context
  proof is still blocked by the local Docker socket.
- 2026-08-01: Slice 2 complete; next is the disposable paired Bake benchmark.
- 2026-08-01: Slice 3 in progress: prepare a disposable native-ARM benchmark
  that compares explicit sequential DF builds with shared-target Bake using the
  same commit, arguments, builder, platform, and non-pushing output.
- 2026-08-01: Slice 3 complete: three paired native `ubuntu-24.04-arm` rounds
  passed for both targets, but Bake's median critical-path improvement was
  7.4% (63s versus 68s), below the 20% adoption gate; median whole-job time was
  77s versus 82s. The diagnostic branch/workflow is being removed and the
  explicit DF build steps remain the production recommendation.
- 2026-08-01: Slice 4 in progress: add the fork-safe, pnpm-store-cached PR
  quality job and parallel native-ARM `app`/`migration-runner` validation job.
- 2026-08-01: Slice 4 review and simplification both passed with no actionable
  findings. The workflow keeps quality and native-ARM image feedback in
  independent jobs, with no registry, deployment, or privileged cache path.
- 2026-08-01: Final maintainability review found one drift case in the staging
  app-tag rewrite. The workflow now asserts the expected app tag immediately
  after substitution, before it can stage or push desired state; final security
  and maintainability re-reviews cover this fix.
- 2026-08-01: Captured the staging shell interpolation and fail-closed
  freshness lesson in `docs/solutions/logic/staging-latest-wins-freshness-guard.md`.
- Pending: staging publish approval, representative same-repository/fork PR
  validation, and eventual branch-protection enforcement.
