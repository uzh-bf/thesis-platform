# Thesis mail-secret split follow-up

## Goal

- Problem: Thesis uses `FLOW_SECRET` for both Power Automate proposal callbacks and the generic Outlook mail relay. Copying the Careers relay secret into that variable broke the callback before CleverReach draft creation.
- Goal: isolate the mail relay credential, preserve the proposal callback credential, remove secret-bearing proposal-flow logs, and re-run the staging supervisor smoke.
- Non-goals: change Careers, change production values, change CleverReach templates or recipient policy, or send CleverReach mail automatically.

## Plan identity

- Thesis repository: `/Users/rschlae/Git/df/thesis-platform`
- Thesis branch: `rs/cleverreach-mail-secret-split`
- Thesis target: `main`
- df-cloud worktree: `/Users/rschlae/Git/df/df-cloud/trees/rs-thesispf-mail-secret-split`
- df-cloud branch: `rs/thesispf-mail-secret-split`
- df-cloud target: `stg`
- Related history: `project/2026-08-09-cleverreach-mail-reminder-plan.md`; merged application PR [#191](https://github.com/uzh-bf/thesis-platform/pull/191); merged infrastructure MR [!364](https://gitlab.uzh.ch/uzh-bf/cloud/df-cloud-klickeruzh/-/merge_requests/364).

## Evidence and decisions

- Evidence: the staging publish call returned successfully, but the callback-created proposal was absent and the app logged that the CleverReach draft was skipped.
- Evidence: the proposal callback and several existing Thesis callbacks read `FLOW_SECRET`; the mail helper also read `FLOW_SECRET`.
- Evidence: `MAIL_SENDING_FROM` is `theses@df.uzh.ch` for Thesis staging.
- Decision: `FLOW_SECRET` remains the proposal and existing callback secret.
- Decision: `MAIL_SENDING_FLOW_SECRET` is used only by `sendMail` and mapped only to `thesispf`, never to `thesispf-ibw`.
- Decision: remove the signed proposal-flow URL, full payload, raw Axios error, and response-body logging.

## Planning-stage review

- Reviewer: configured planner, read-only.
- Result: `DONE_WITH_CONCERNS`; recommended the split, focused ExternalSecret coverage, conflict/missing-secret tests, and sanitized Axios logging.
- Accepted: all recommendations above.

## Slices

### Slice 1 - isolate the mail relay and sanitize proposal-flow logging

- Route: main; the slice crosses an authentication boundary and has a security-sensitive logging decision.
- Do: update `sendMail`, local template, deterministic relay verification, and `submitProposalPublish`; add the new df-cloud key to the `thesispf` mapping.
- Check: focused Thesis verifier, authorization verifier, TypeScript, owned-file lint, formatting, `git diff --check`; df-cloud focused ExternalSecret test and TypeScript.
- Commit: one Thesis code commit and one df-cloud mapping/test commit.

### Slice 2 - recover and verify staging

- Route: main; secret values, cluster state, browser authentication, and external delivery remain in the main session.
- Do: restore the pre-copy Thesis `FLOW_SECRET` without exposing it, provision the new relay secret without exposing it, refresh the ExternalSecret, restart only `app-thesispf-thesis-platform`, and run one synthetic supervisor publish.
- Check: ExternalSecret `Ready/SecretSynced`, deployment ready, one proposal callback, one CleverReach draft, one successful relay call, and Outlook evidence for `theses@df.uzh.ch`.

## Test portfolio

- Mail secret isolation: extend the existing deterministic relay contract test. It must prove the new key is used, a conflicting `FLOW_SECRET` is ignored, and a missing new key skips the request.
- Proposal authorization: existing `scripts/verify-submit-proposal-publish-auth.ts`; no new test.
- ExternalSecret scope: add a focused `src/apps/thesispf/external-secrets.test.ts` covering `thesispf` in `stg`/`prd` and excluding the new key from `thesispf-ibw`.
- Log hygiene: static source assertions plus focused smoke logs; no raw secret or payload output.

## Authority and finish gates

- Local edits, tests, and commits are approved.
- Secret allowlist changes and secret writes are approved only for this split and must remain values-free in output.
- Staging ExternalSecret refresh, deployment restart, and synthetic smoke are approved by the user.
- Push, MR/PR updates, merge, production secret changes, and production deployment remain separate gates.
- Final completion requires fresh verification and an integrated read-only review of the exact committed range.

## Progress

- [x] Reproduced the staging failure after the secret copy.
- [x] Confirmed the callback/mail `FLOW_SECRET` collision.
- [x] Created the Thesis and df-cloud follow-up branches.
- [x] Finished Slice 1 implementation and verification: the Thesis relay and authorization checks pass; the df-cloud ExternalSecret scope test passes with the pinned Node/pnpm runtime; formatting and diff checks pass. The df-cloud package typecheck remains unavailable because the checked-out `azure-helpers` submodule's generated declarations do not match the existing df-cloud type surface.
- [ ] Recover secrets and complete Slice 2 staging verification.
