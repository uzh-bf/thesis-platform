# ARM Staging Build Optimization

## Goal

Keep one staging image build for each qualifying push to `main`. Build only the
ARM64 image used by the current ArgoCD staging deployment and reduce build time
on GitHub Actions.

## Scope

- Remove the legacy amd64 staging workflow in
  `.github/workflows/docker-image-stg.yml`.
- Keep the existing staging ARM image names, immutable SHA tag, build arguments,
  registry publishing, deployment-values update, and pull-request automation.
- Do not change production workflows or runtime secret management.

## Workflow Design

The staging ARM job will run on GitHub's native `ubuntu-24.04-arm` hosted runner.
The QEMU setup step will be removed because the runner and target image share the
same architecture. Docker Buildx remains responsible for building and publishing
the image.

BuildKit will import and export a GitHub Actions cache under the dedicated
`stg-arm` scope. Maximum cache mode will retain intermediate stages, including
the dependency-installation layer. Changes to `pnpm-lock.yaml` or earlier
Dockerfile layers will invalidate those layers normally.

Workflow-level concurrency will use one group for the staging ARM workflow and
branch. A newer push to the same branch will cancel an older in-progress build,
preventing an obsolete image from consuming runner time or updating the ArgoCD
image tag after a newer commit.

## Dockerfile Optimization

Remove the three `apk update` commands that follow `apk add --no-cache`. The
package installation already fetches the required indexes for that operation;
persisting another package-index update creates work without affecting the
resulting application image.

No dependency, Node.js, pnpm, Prisma, build-argument, or runtime-user changes are
included.

## Secret and Deployment Boundaries

The Docker workflow continues using `.env.stg` for public build-time settings.
Runtime secrets remain supplied by the Kubernetes secret named
`stg-thesisplatform-secrets`, referenced by `deploy/stg_new/values.yaml`. This
change neither reads nor migrates secrets and does not modify Infisical or
Doppler configuration.

## Failure Behavior

- Native ARM runner unavailable: job remains queued or fails during runner setup;
  workflow can temporarily return to x64 plus QEMU without changing image tags.
- Cache miss: Docker performs a clean build; image correctness does not depend
  on cached content. Cache-service errors remain visible as workflow failures
  and can be retried.
- Superseded push: older run is cancelled; newest run owns image publication and
  deployment-tag update.

## Verification

Before handoff:

1. Parse workflow YAML and inspect resulting workflow triggers and job fields.
2. Confirm no repository reference remains to `docker-image-stg.yml` or the old
   staging amd64 tags.
3. Confirm ARM tags and `linux/arm64` target remain unchanged.
4. Review the git diff for unrelated changes and preserve the user's untracked
   `.infisical.json` file.

After merge, the first push may still perform a mostly cold build. A later push
with an unchanged lockfile should reuse cached dependency and base-image layers.
