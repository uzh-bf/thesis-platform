# Production ARM Build and Manual Deploy

## Goal

Publish only ARM64 production images for DF and IBW, using native free GitHub
runners and the streamlined shared Dockerfile. Separate image publication from
deployment. Production values change only through an explicitly dispatched
workflow that commits directly to `main`; no deployment pull request is created.

## Production Build Workflow

The existing `.github/workflows/docker-image-prd.yml` remains release-driven.
Qualifying `chore(release)` pushes build two images:

- DF: `ghcr.io/uzh-bf/thesis-platform`
- IBW: `ghcr.io/uzh-bf/thesis-platform-ibw`

Remove the two amd64 jobs. The DF and IBW ARM jobs run on
`ubuntu-24.04-arm`, retain `platforms: linux/arm64`, and use the runner's default
Docker/BuildKit builder. Remove QEMU and explicit Buildx setup.

Each image retains three release tags:

- `<release-tag>-arm`
- `stable-arm`
- `stable-arm-<release-commit-sha>`

Move GitHub Release creation from the removed DF amd64 job into a final job that
depends on both ARM builds. Release creation is idempotent: a rerun leaves an
existing release unchanged instead of failing.

Remove the production deploy-values update and PR creation job. Add both
production values files to the release workflow's ignored paths so a manual
deployment commit does not create a redundant production build workflow run.

## Manual Deploy Workflow

Add `.github/workflows/deploy-production.yml` with only a `workflow_dispatch`
trigger. Require a `release_tag` string such as `v1.17.0`. The job runs only when
the workflow is dispatched from `main`.

The job performs these operations in order:

1. Fetch tags and resolve the exact commit for `release_tag`; reject a missing or
   non-`v*` tag.
2. Authenticate to GHCR.
3. Verify both immutable image manifests exist:
   `stable-arm-<release-commit-sha>` in the DF and IBW repositories.
4. Fetch current `origin/main` and recreate the local `main` branch from it.
5. Update `deploy/prd_new/values.yaml` and
   `deploy/prd_ibw_new/values.yaml` to the verified immutable tags.
6. Commit only those two files with a `chore(deploy)` message and push normally
   to `main`.

The job targets the protected GitHub `production` environment. Its checkout
uses the environment secret `PRODUCTION_DEPLOY_TOKEN`, a fine-grained token with
repository Contents read/write permission whose owner is explicitly allowed to
bypass the `main` pull-request requirement. `actions/checkout` persists that
credential for the final normal `git push`. GHCR authentication continues to
use the short-lived `GITHUB_TOKEN`; the deployment token is not passed to Docker
or interpolated into shell commands.

The workflow does not force-push and never opens or updates a pull request. A
no-change deployment exits successfully without a commit.

## Safety and Failure Behavior

- Missing release tag or either missing image: fail before editing deployment
  values.
- Concurrent manual deployments: serialize them with workflow concurrency and do
  not cancel an in-progress production deployment.
- Main advances during deployment: normal push is rejected; rerun the manual
  workflow against current `main`.
- Missing or unauthorized `PRODUCTION_DEPLOY_TOKEN`: checkout or the final push
  fails visibly. No automatic PR fallback is allowed.
- The deployment token is scoped through the protected `production` environment
  and used only for repository checkout and the final direct push.
- Image builds fail: GitHub Release job does not run, and deployment remains a
  separate unavailable manual action until valid images exist.

## Scope Boundaries

The staging workflow, production build arguments, application configuration,
runtime secrets, Helm templates, ArgoCD image formats, and release commit naming
remain unchanged. The shared Dockerfile optimization already applies equally to
staging and production builds.

## Verification

1. Parse both workflow YAML files.
2. Confirm only two production build jobs target images and both run on native
   ARM with `platforms: linux/arm64`.
3. Confirm no QEMU, explicit Buildx setup, amd64 image tags, deployment-update
   branch, or PR command remains in the production build workflow.
4. Confirm manual deploy requires `release_tag`, targets the `production`
   environment, checks out with `PRODUCTION_DEPLOY_TOKEN`, verifies both image
   manifests, changes only the two production values files, and uses a
   non-force push.
5. Run `git diff --check` and inspect the complete workflow diff.
6. After merge, validate image publication on the next release. Then dispatch the
   deploy workflow from `main` with that release tag and confirm the direct commit
   and ArgoCD sync.
