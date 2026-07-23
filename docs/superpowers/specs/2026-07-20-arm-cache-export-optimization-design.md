# ARM Cache Export Optimization

## Evidence

GitHub Actions run 69 spent 4 minutes 52 seconds in the Docker build-and-push
step. BuildKit timings showed approximately 57 seconds for the Next.js build,
34 seconds for image export and push, and 182 seconds for the GitHub Actions
cache export. The dependency installation covered by the exported cache took
approximately 10 seconds during the cold build.

## Design

Remove `cache-to: type=gha,mode=max,scope=stg-arm` from the staging ARM workflow.
Keep `cache-from: type=gha,scope=stg-arm` so existing cached layers remain usable
until GitHub evicts them. Cache misses remain safe because Docker rebuilds the
affected layers normally.

Do not change the native ARM runner, concurrency behavior, image tags, build
arguments, production workflows, deployment update, or secret handling.

## Alternatives Considered

- `mode=min`: still uploads cache data but does not retain the intermediate
  dependency stage that provides the useful cache hit.
- Conditional `mode=max` export: refreshes cache only after dependency changes,
  but adds workflow branching and still creates occasional multi-minute exports.
- External or self-hosted builder: can retain local BuildKit state, but adds cost
  or operational ownership beyond this optimization.

## Expected Result

Removing the measured 182-second export should reduce typical staging runs to
roughly 1.5 to 2 minutes. Registry/network variance and source-dependent Next.js
build time prevent a strict duration guarantee.

## Verification

1. Parse the workflow YAML.
2. Confirm `cache-from` remains and `cache-to` is absent.
3. Run `git diff --check` and verify production workflow remains unchanged.
4. Measure the first merged `main` run against run 69.
