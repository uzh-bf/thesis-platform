# Streamlined ARM Docker Build

## Goal

Reduce staging ARM workflow duration on free GitHub-hosted runners without
changing the standalone Next.js artifact, migration behavior, runtime user,
image tags, deployment automation, or secret handling. Target a typical runtime
of approximately 1 minute 20 seconds to 1 minute 45 seconds; do not claim a
sub-minute guarantee.

## Evidence

GitHub Actions run 70 completed in 2 minutes 35 seconds. Inside the Docker build,
BuildKit spent 27 seconds downloading and extracting a 257 MB cached
`node_modules` layer, while the original cold dependency installation took about
10 seconds. Next.js standalone generation took 58 seconds, the global Prisma CLI
installation took 8 seconds, and final image export and push took 15.5 seconds.
Docker Buildx setup added another 10 seconds at workflow level.

## Workflow Design

Remove the GitHub Actions cache import. The measured remote-cache restoration is
slower than installing dependencies directly on the native ARM runner.

Remove the explicit Docker Buildx setup step. The build remains a single native
ARM64 target and can use the runner's default Docker/BuildKit builder through
`docker/build-push-action`. Keep `platforms: linux/arm64` as an assertion of the
published image architecture.

Expand ignored paths for files that cannot affect the application image:

- Markdown documentation
- `docs/`, `project/`, `backups/`, `bruno/`, and `solutions/`
- editor and agent configuration
- `LICENSE`

A push containing any non-ignored file still triggers the build. The existing
deployment-values ignore remains. Application source, Prisma files, public
assets, package manifests, environment files, build configuration, Docker files,
and workflow changes therefore continue to trigger staging images.

## Dockerfile Design

Merge the `deps` and `builder` stages. Install dependencies directly in the
builder stage before copying source files. This preserves Docker layer ordering
for local reuse while eliminating the cross-stage materialization of the full
dependency tree.

Keep the runner stage unchanged, including the global Prisma CLI installation.
Replacing it would require changing migration-job packaging and is outside this
optimization. Because production workflows share this Dockerfile, they receive
the same builder-stage simplification, but their workflow triggers, runner types,
architectures, and tags remain unchanged.

## Failure and Rollback

- If the default builder cannot publish the native ARM image, restore the pinned
  Buildx setup step without restoring the external cache.
- If a required repository path was classified as non-runtime, remove that path
  from `paths-ignore`; mixed commits containing application changes still build.
- Dependency or build failures remain visible in the Docker build step and do
  not update ArgoCD image tags.

## Verification

1. Parse the workflow YAML.
2. Confirm Buildx setup and all `cache-from`/`cache-to` inputs are absent.
3. Confirm `platforms: linux/arm64`, image tags, build arguments, and deployment
   update steps remain unchanged.
4. Build the Dockerfile locally when an ARM Docker daemon is available; otherwise
   rely on the first branch workflow run for runner-level verification.
5. Run `git diff --check`, confirm production workflow is unchanged, and inspect
   the Dockerfile stage graph.
6. Measure the first merged application-changing run against run 70.
