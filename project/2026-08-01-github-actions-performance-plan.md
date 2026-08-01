# GitHub Actions Performance and Feedback Plan

Date: 2026-08-01
Status: Draft for independent review; no workflow behaviour has changed
Branch: `rs/github-actions-performance-plan`
Target branch: `main`
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
| Cancel an in-progress staging build when a newer eligible `main` push arrives | Approve `cancel-in-progress: true` for staging only. | A superseded run can stop before it updates desired state; the next eligible run becomes the deployment candidate. This favors newest-state convergence over building every intermediate commit. | Planned, but do not merge this slice without explicit approval. |
| Replace the two sequential Buildx calls with Bake | Benchmark first; adopt only when the critical path improves by at least 20% without increasing billed runner time by more than 10%. | It adds a build definition and changes an already fast, working image path. | Experimental slice; omit from the delivery branch if the threshold is not met. |
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
| Staging stale work | Running builds are not cancelled; a burst can wait behind an obsolete build. | A newer eligible push cancels the prior staging run, and the eventual deployment tag is the newest eligible SHA. |
| Staging build critical path | 2m34 in the latest verified successful run. | No more than 10% slower after the safe context/concurrency changes. |
| Buildx shared-target experiment | DF release path: 2m12 app + 1m57 migration serially. | Adopt only if the median critical path is at least 20% lower over three comparable native-ARM runs, with no image or migration regression. |
| PR feedback | No checked-in `pull_request` quality workflow. | A PR receives independent lint, app-build, and non-pushing ARM image validation results without registry or deployment credentials. |

Use at least five normal staging runs after merge for the staging metrics. Do not
manufacture a release to collect production timing; inspect the next real release
instead.

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

- Change only the staging workflow-level concurrency setting to
  `cancel-in-progress: true`.
- Keep the existing group `build-staging-arm-${{ github.ref }}` so cancellation
  is scoped to one staging branch, not to production, release, PR validation,
  or unrelated workflows.
- Preserve the current `main` guard, path exclusions, native ARM runner,
  `linux/arm64` output, image tags, registry permissions, and deployment-values
  update code.
- Add a concise comment explaining that the group implements latest-wins staging
  deployment and intentionally does not apply to production.

Why this is safe:

- Cancellation is cooperative. A run may leave an immutable image tag published
  and a `git push` already in progress can win a race with cancellation; the
  plan therefore promises eventual convergence to the newest eligible SHA after
  the commit burst, not an impossible guarantee that no stale tag is ever
  written transiently.
- The newer eligible run publishes a SHA-specific image and updates desired
  state. Deployment is therefore eventually directed at the latest eligible
  source, not at an older queued source.
- Existing deploy commits remain excluded by the job condition, preventing a
  workflow loop.

Verification:

- Parse the changed workflow and inspect its rendered `concurrency` block.
- Create two qualifying non-release commits only after the user approves staging
  resource use. Confirm the earlier run is `cancelled`, the final run succeeds,
  and `deploy/stg_new/values.yaml` points to the later SHA-specific image tag.
- Confirm a release workflow remains unaffected and retains
  `release-production` with `cancel-in-progress: false`.

Rollback:

- Revert the one concurrency setting if every qualifying commit must finish or
  cancellation exposes an Actions race. No registry or deployment cleanup is
  required; SHA tags are immutable build artifacts.

Commit:

- `ci(staging): cancel superseded ARM image builds`

## Slice 2 — Reduce Docker Build Context Safely

Files:

- `.dockerignore`

Do:

- Inspect every candidate path for build-time references before excluding it.
- Add only paths already classified as non-runtime by the staging trigger and
  not consumed by the Dockerfile or Next build: `.agents/`, `.claude/`,
  `.vscode/`, `backups/`, `bruno/`, `docs/`, `project/`, `solutions/`, `LICENSE`,
  and Markdown files outside runtime assets.
- Do not exclude `.env.production`, `.env.stg`, `.env.stage`, `public/`,
  `prisma/`, `patches/`, build configuration, or any package-manager input.
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

Files, only if the benchmark passes:

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

- Define a minimal `docker-bake.hcl` with a common target and separate targets
  for DF app, DF migration, and IBW app. Parameters must cover image repository,
  immutable tags, target name, platform, and the existing public build arguments.
- Invoke the targets with one normal native-ARM Buildx builder per workflow run.
  Preserve the existing `linux/arm64`, push behavior, Docker labels, image
  repositories, SHA-specific tags, and migration target.
- Do not use Docker GitHub Builder, self-hosted runners, `cache-to`, or
  `cache-from` in this experiment. Those are different architecture decisions.
- Use `docker buildx bake --check` to validate the definition before running it.
- Compare at least three equivalent non-production builds to the Slice 0
  baseline. A non-pushing PR-only build is preferred; no release is created only
  for this experiment.

Adoption gate:

- Keep Bake only if it improves the median critical path by at least 20%, does
  not increase runner time by more than 10%, produces the same image manifests,
  and does not complicate rollback or tag calculation.
- If the result is neutral or worse, remove the experimental files and retain
  the two explicit build steps. Document the measured result in this plan.

Verification when adopted:

- `docker buildx bake --check`
- Native-ARM non-pushing builds of `app` and `migration-runner`
- `docker buildx imagetools inspect` for the published DF, DF migration, and
  IBW SHA-specific ARM tags on the next normal release
- Confirm the production deployment job waits for both image targets and no
  longer than before.

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
- Grant only `contents: read`; do not log into GHCR, request package write
  permission, read deployment secrets, or update deployment values.
- Add a `quality` job on `ubuntu-24.04` that:
  1. checks out with the repository's pinned `actions/checkout` revision;
  2. sets up pnpm `11.9.0` with a pinned `pnpm/action-setup` revision before
     requesting the pnpm store cache;
  3. installs Node `24.18.0` and uses `actions/setup-node`'s pnpm store cache
     keyed by `pnpm-lock.yaml`, matching the committed `packageManager` and
     `engines` contract;
  4. runs `pnpm install --frozen-lockfile`, `pnpm lint`, and `pnpm build`.
- Add a parallel `image-targets` job on `ubuntu-24.04-arm` that builds the
  `app` and `migration-runner` targets without `push: true` and without public
  staging/production build arguments. It validates the actual native image
  path while remaining side-effect-free.
- If Slice 3 is adopted, use the same Bake definition in the image job; if not,
  keep the job's Docker commands explicit and small.
- Do not add E2E to this workflow. Create a follow-up proposal after measuring
  a CI run with Postgres, Azurite, OIDC, and Playwright browser setup.

Why this cache differs from the rejected Docker cache:

- `actions/setup-node` caches the pnpm store for a host-side lint/build job.
- The Docker cache experiment stored a large BuildKit layer remotely and was
  empirically slower than a native cold install. The two caches have different
  data, ownership, and performance characteristics.

Verification:

- YAML parse and workflow syntax review.
- A same-repository PR and a fork PR both run without secrets and complete the
  two jobs.
- Confirm the cache key changes when `pnpm-lock.yaml` changes and restores only
  the pnpm store, not `node_modules`.
- Intentionally introduce one lint error and one Docker-context/target error in
  disposable commits to show that each job fails for the intended reason.
- After several green PRs, obtain explicit approval before configuring either
  result as a required GitHub branch-protection check.

Commit:

- `ci(validation): add pull request quality gates`

## Slice 5 — Rollout, Observation, and Documentation

Do:

- Merge in dependency order: Slice 1, Slice 2, optional Slice 3, then Slice 4.
  Keep each slice independently green and reviewable; do not merge an optional
  Bake experiment that misses its gate.
- Before any staging run that publishes images or updates desired state, state
  the expected resource and deployment effect in chat and obtain approval.
- Observe at least five normal staging runs after Slice 1/2. Record timing,
  cancellation behavior, SHA tag, and desired-state result in this plan's
  `Progress` section.
- Observe the next ordinary release only; confirm ARM manifests, release
  creation, production serialization, and the deployment job remain correct.
- Update the repository's CI documentation only with verified facts. Do not
  claim a cache or Bake win before the required measurements exist.

Finish criteria:

- Native ARM runners remain in all ARM build jobs.
- After a quiescent commit burst, staging converges to the latest eligible SHA;
  any cancellation race is observable and explicitly assessed rather than hidden.
- Docker context excludes only verified non-build inputs.
- PRs receive safe quality and image-target feedback before merge.
- No production release/deployment behavior, secrets, or runner ownership was
  widened.
- Bake is either adopted with measured success or explicitly rejected with the
  measured evidence preserved.

## Review and Test Matrix

| Change | Local/static proof | GitHub Actions proof | Live approval required |
| --- | --- | --- | --- |
| Staging cancellation | YAML/diff review; group is staging-only | Two qualifying staging runs show cancellation then newest successful tag | Yes: image publication and staging desired-state update |
| `.dockerignore` | Reference inventory; native target builds; context-size comparison | Next normal staging build | Yes for the normal staging deployment, not for local target builds |
| Bake experiment | `docker buildx bake --check`; non-pushing target build | Three comparable native-ARM PR/diagnostic runs | No for non-pushing PR diagnostics; yes before any staging publish |
| PR validation | Workflow YAML and least-privilege review | Same-repo and fork PR runs | No; branch-protection activation needs separate approval |
| Production regression check | Workflow diff confirms no release-concurrency/runner/tag change | Next ordinary release succeeds | Do not create a synthetic release |

## Progress

- 2026-08-01: Plan drafted from live `origin/main` at `09ab3bf` after a runner,
  cache, timing, concurrency, Dockerfile, and workflow-trigger audit.
- Pending: independent SOL high review and user rulings on staging cancellation,
  Bake adoption threshold, and eventual branch-protection enforcement.
