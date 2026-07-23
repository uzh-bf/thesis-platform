# Automated Staging and Production Deployment Flow

## Goal

Deploy staging automatically after every qualifying push to `main`. Deploy both
production variants automatically after `pnpm release:publish` pushes a release
commit and tag. Update ArgoCD image tags directly on protected `main`, without
deployment branches, pull requests, or force pushes.

## Authentication and Branch Protection

Create a fine-grained personal access token owned by `mxmlnwbr` and restricted
to `uzh-bf/thesis-platform`. Grant only `Contents: Read and write`. Store it as
the repository Actions secret `DEPLOY_PUSH_TOKEN`.

The existing classic branch protection rule already lists `mxmlnwbr` as an
actor that may bypass required pull requests. Git operations authenticated with
that token therefore use the existing actor bypass. Do not enable `Allow force
pushes`: deployment commits use normal fast-forward pushes and never rewrite
history.

A missing or invalid `DEPLOY_PUSH_TOKEN` must fail the tag-update step visibly.
There is no fallback to `GITHUB_TOKEN`, because a fallback could hide incorrect
branch-protection or secret configuration.

## Staging Flow

The staging workflow remains triggered by qualifying pushes to `main` and by
manual dispatch. It builds and publishes these ARM64 image tags:

- `main-arm`
- `latest-arm`
- `latest-arm-<source-commit-sha>`

After the image publication succeeds, the workflow fetches current
`origin/main`, checks out that exact revision, updates only
`deploy/stg_new/values.yaml` to `latest-arm-<source-commit-sha>`, and creates a
`chore(deploy)` commit. It pushes the commit directly to `main` with
`DEPLOY_PUSH_TOKEN`.

Remove staging deployment-branch creation, force-push logic, pull-request
lookup, and pull-request creation. Keep the staging values file in the
workflow's ignored paths. The deployment commit also contains `[skip ci]`, so it
does not start an unrelated workflow run.

## Production Release and Deployment Flow

`pnpm release:publish` remains the operator command. It runs
`standard-version`, then pushes the release commit and version tag to
`origin/main`. The production workflow recognizes the `chore(release)` commit
and builds both ARM64 images:

- DF: `ghcr.io/uzh-bf/thesis-platform:stable-arm-<release-commit-sha>`
- IBW: `ghcr.io/uzh-bf/thesis-platform-ibw:stable-arm-<release-commit-sha>`

After both builds succeed, a deployment job fetches current `origin/main`,
checks out that exact revision, and updates only:

- `deploy/prd_new/values.yaml`
- `deploy/prd_ibw_new/values.yaml`

Both values receive the immutable `stable-arm-<release-commit-sha>` tag. The
job creates one `chore(deploy)` commit and pushes it directly to `main` with
`DEPLOY_PUSH_TOKEN`. GitHub Release creation remains dependent on successful
image builds; it may run alongside the tag-update job because neither changes
release artifacts.

The manual `deploy-production.yml` workflow becomes redundant and is removed.
`pnpm release` alone still only creates the local release commit and tag;
automatic production publication starts when `pnpm release:publish` pushes
them.

## Concurrency and Failure Behavior

- Serialize staging tag-update work so simultaneous builds cannot overwrite a
  newer desired image.
- Production deployment starts only after both immutable images build
  successfully.
- Fetch `origin/main` immediately before editing deployment values.
- Use normal fast-forward pushes. If `main` advances between fetch and push,
  fail visibly; a new workflow run or rerun reconciles against current `main`.
- Never force-push, rebase a remote branch, or silently discard another commit.
- If an image build fails, leave current deployment values unchanged.
- If the deployment tag is already current, exit successfully without a commit.
- Deployment commits change only their environment's values files.

## Documentation

Update the README deployment section to describe direct GitOps tag commits,
the `DEPLOY_PUSH_TOKEN` setup, automatic staging behavior, and the production
release command. Remove wording that says Actions opens deployment pull
requests.

## Verification

1. Parse all workflow YAML files.
2. Confirm staging builds on qualifying `main` pushes and directly updates only
   `deploy/stg_new/values.yaml`.
3. Confirm release pushes build both production images before directly updating
   both production values files.
4. Confirm all direct pushes use `DEPLOY_PUSH_TOKEN` and no workflow contains a
   force-push or deployment pull-request path.
5. Confirm deployment-only commits cannot cause workflow loops.
6. Run `git diff --check` and inspect the complete workflow diff.
7. After configuration lands, add the repository secret and test with a normal
   staging commit before the next production release.

## Scope Boundaries

Do not change Docker build arguments, image repositories, Helm templates,
ArgoCD applications, runtime secrets, database workflows, or application code.
Do not weaken the pull-request requirement for humans and do not enable force
pushes on `main`.
