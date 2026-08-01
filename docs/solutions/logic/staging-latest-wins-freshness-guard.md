---
module: ci
date: 2026-08-01
problem_type: logic
severity: medium
symptoms:
  - "A cancelled or slower staging run could finish after a newer main push."
  - "An excluded release/deploy push could still cancel an eligible staging run."
  - "A cancelled workflow run could be selected as the newest source SHA."
  - "The migration tag replacement could silently produce an empty value."
  - "A failed freshness API lookup could be mistaken for a stale-success exit."
root_cause: "Latest-wins cancellation was treated as sufficient, while excluded triggers, cancelled-run filtering, shell status propagation, and Perl environment interpolation were not verified at the deployment boundary."
tags: [github-actions, staging, arm, concurrency, shell, deployment]
---

# Staging latest-wins needs a fail-closed freshness guard

## Problem

The staging workflow builds immutable ARM images and then updates the desired
state in `deploy/stg_new/values.yaml`. Cancellation improves throughput, but a
run that is already executing can still reach the deployment step after a newer
eligible `main` push. That stale run must not win the desired-state push.

## Symptoms

The first implementation review found two concrete shell defects at the
deployment boundary:

- The migration fallback used a shell variable inside a Perl replacement rather
  than Perl's environment namespace, which could write an empty tag.
- A command substitution inside an `if` condition masked a failed freshness
  helper, allowing the run to exit as if it were merely stale.

The follow-up review found two concurrency/source-selection defects:

- The workflow-level group covered every trigger, so a skipped
  `chore(release)` or `chore(deploy)` push could cancel an eligible staging run.
- The freshness query did not exclude completed runs with a `cancelled`
  conclusion, so a cancelled run could be treated as the newest source.

## What Didn't Work

- `cancel-in-progress: true` by itself was insufficient: cancellation is
  cooperative, so an already-running job can continue into its final push.
- A job-level skip condition was insufficient to protect the workflow-level
  concurrency group: skipped triggers still participate in the group before
  the job condition is evaluated.
- The freshness query must filter cancelled conclusions as well as trigger and
  commit-message eligibility; otherwise a cancelled run can win the source
  selection race.
- Writing `'$STAGING_MIGRATION_IMAGE_TAG'` inside the Perl expression did not
  read the shell environment in the replacement context. The working form is
  `$ENV{STAGING_MIGRATION_IMAGE_TAG}`.
- Comparing `$(latest_eligible_sha)` directly in `[[ ... ]]` made a helper error
  indistinguishable from a non-matching SHA. The caller must assign the result
  and handle the status before comparing it.

## Solution

The workflow now isolates excluded triggers with a unique concurrency suffix and
shares the latest-wins group only for eligible pushes. Its bounded freshness
query ignores cancelled conclusions as well as excluded triggers, then fails
closed when the API cannot establish freshness. The deployment checks freshness
before editing, after fetching `origin/main`, and immediately before committing
and pushing (`.github/workflows/docker-image-stg-arm.yml:24-29`, `:130-158`, and
`:175-222`). The migration fallback reads the exported tag through Perl's
environment namespace (`.github/workflows/docker-image-stg-arm.yml:166-172`).

## Why This Works

Cancellation removes obsolete work when GitHub can stop it, while the SHA
comparison is the correctness mechanism for jobs that already passed the
cancellation boundary. A stale run exits without changing desired state. A
freshness lookup failure is an explicit error, so the workflow cannot silently
publish an unverified deployment commit. Normal `git push` preserves the
non-force-push compare-and-swap against concurrent `main` updates.

## Prevention

- Keep the helper's status handling explicit at every freshness checkpoint.
- Keep the concurrency-group eligibility predicate aligned with the freshness
  query's trigger and commit filters, and exclude cancelled conclusions.
- Keep shell and Perl interpolation domains visibly separate by passing values
  through exported environment variables.
- Run `bash -n`, `shellcheck`, YAML parsing, and fixtures for helper failure and
  migration-tag replacement before requesting a staging burst.
- Validate the final desired-state convergence only after all affected staging
  runs are terminal; cancellation signals alone are not evidence.
