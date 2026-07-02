# Thesis CleverReach API Migration Plan

Date: 2026-07-02
Branch: `codex/thesis-cleverreach-api`

## Goal

Move thesis proposal CleverReach draft creation from Power Automate child flow into the Next.js app, using the same API-based pattern that worked in `careers`.

Scope stays narrow:

- Keep Power Automate as proposal workflow owner for now: PDF persistence, `addProposal`, supervision assignment, supervisor confirmation email.
- Do not edit Power Automate solution or flow JSON.
- Move only CleverReach draft creation into app code.
- Use prepared template `THESIS_PROPOSAL_V0`.
- Send to the CleverReach filter for users who signed up for `theses` updates.
- Add a short preheader with new information, not the title.

## Current State

App entrypoint:

- `src/server/routers/_app.ts` has `submitProposalPublish`.
- It posts proposal data to `PROPOSAL_PUBLISH_URL`.
- Staging already has external-flow safety through `areExternalFlowsEnabled()`.

Power Automate thesis proposal posting flow:

- `solutions/UZHBFThesisPlatform/Workflows/UZHBFThesisPlatform-ThesisProposalPosting-F3E0B1EB-152A-EE11-BDF5-000D3A831DD0.json`
- Flow creates `ProposalId` with `guid()`.
- Flow calls app callbacks:
  - `/api/addProposal`
  - `/api/getResponsibleIdAndAddProposalSupervision`
  - `/api/addAttachment`
- Flow currently runs CleverReach child flow when its CleverReach env params are not `EMPTY`.
- Current CleverReach config there uses `THESIS_POSTING_TEST`, old `{{...}}` placeholders, whole group `560174`, no preheader.

Power Automate CleverReach child flow:

- `solutions/UZHBFThesisPlatform/Workflows/UZHBFThesisPlatform-Cleverreach-3FA5D199-C377-F011-B4CC-00224874B350.json`
- Fetches template HTML, applies replacements, creates draft through `https://rest.cleverreach.com/v3/mailings.json`.
- Sends `receivers.groups`, not `receivers.filter`.
- Sends HTML content only, no text fallback.

Careers pattern to copy:

- Fetch OAuth token with client credentials.
- Find user template by name.
- Fetch template HTML.
- Render placeholders in app code.
- Create draft mailing with HTML and text content.
- Use `receivers.filter`, not group ID.
- Do not fail main publish flow if CleverReach draft creation fails. Log and notify instead.

## Key Design

Keep proposal publish flow unchanged, then resolve the proposal ID from the app DB.

Reason:

- CleverReach template needs proposal link.
- Flow currently generates `ProposalId` internally.
- We do not edit Power Automate.
- App cannot know the ID before the flow calls `/api/addProposal`.
- Smallest app-only fix: after successful flow submission, start a background lookup for the newly persisted proposal and use that real DB ID for the CleverReach draft.

Lookup key:

```text
title + summary + study level + language + topic area slug + time frame + responder + recent createdAt
```

App then creates the CleverReach draft with:

```text
{APP_URL}/{persistedProposal.id}
```

## Template Contract

Target template: `THESIS_PROPOSAL_V0`

Expected placeholders:

```text
[[PREHEADER]]
[[PROPOSAL_TITLE]]
[[PROPOSAL_SUMMARY]]
[[PROPOSAL_SUPERVISOR]]
[[PROPOSAL_RESPONSIBLE]]
[[PROPOSAL_TYPE]]
[[PROPOSAL_LANGUAGE]]
[[PROPOSAL_TIMEFRAME]]
[[PROPOSAL_AREA]]
[[PROPOSAL_LINK]]
[[DEPARTMENT_NAME]]
```

Preheader belongs near top of template, before visible content:

```html
<div
  style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;"
>
  [[PREHEADER]]
</div>
```

If prepared template still uses `{{...}}`, either update template to `[[...]]` or make thesis renderer accept exact placeholder strings. Prefer `[[...]]` for parity with careers.

## Preheader Rule

Subject already contains title:

```text
New Thesis Available: {proposalTitle}
```

Preheader must add new info, stay short, and avoid title repetition.

Preferred format:

```text
{studyLevel}, {topicArea}, {timeFrame}.
```

Example:

```text
Master thesis, Corporate Finance, available now.
```

Fallback order:

1. Study level
2. Topic area display name
3. Time frame
4. Supervisor display name or email only if one of the above is missing

Hard cap: about 80 chars. Trim at field boundaries, not mid-word.

## Segment Rule

Use CleverReach filter ID for the thesis segment.

New env var:

```text
CLEVERREACH_FILTER_THESES
```

Do not use `receiver_group_id`. Careers smoke showed `receivers.filter` is the stable API path.

## Implementation Slices

### Slice 1 - App Config And Client

Add thesis-scoped CleverReach config:

```text
CLEVERREACH_CLIENT_ID
CLEVERREACH_CLIENT_SECRET
CLEVERREACH_SENDER_NAME
CLEVERREACH_SENDER_EMAIL
CLEVERREACH_MAILING_NAME_PREFIX
CLEVERREACH_TEMPLATE_THESIS_PROPOSAL=THESIS_PROPOSAL_V0
CLEVERREACH_SUBJECT_THESIS_PROPOSAL=New Thesis Available: {title}
CLEVERREACH_FILTER_THESES
CLEVERREACH_ADMIN_URL
```

Add API client under `src/lib/cleverreach/`:

- `getAccessToken`
- `fetchTemplateHtml`
- `renderTemplate`
- `createDraftMailing`

Use HTML escaping for user-controlled replacement values.

### Slice 2 - Thesis Draft Builder

Add `src/lib/cleverreach/thesisProposal.ts`.

Inputs:

- proposal ID
- proposal title
- summary
- study level
- language list
- time frame
- topic area display name
- supervisor/responsible names and emails
- department name
- proposal URL

Outputs:

- mailing name
- subject
- preheader
- HTML replacements
- text fallback
- receiver filter ID

Resolve better display values before rendering:

- `fieldOfResearch` from form is currently slug-like. Use `TopicArea.name` where possible.
- Supervisor and responsible are emails. Lookup `User.name` or `Responsible.name` where possible, fallback to email.

### Slice 3 - Router Integration

Update `submitProposalPublish`:

- Keep Power Automate payload contract unchanged.
- After successful Power Automate response, start a non-blocking proposal lookup in the app DB.
- Once the proposal created by the flow is found, trigger CleverReach draft creation with the persisted proposal ID.
- If CleverReach env is incomplete, skip with clear log.
- If CleverReach call fails, log and keep proposal publish success.
- Reuse staging guard: no external CleverReach draft in staging unless `STAGING_ENABLE_EXTERNAL_FLOWS=true`.

### Slice 4 - Duplicate Prevention Without Flow Edits

Prevent duplicate drafts.

Preferred rollout path:

- Keep existing Power Automate CleverReach env params `EMPTY`.
- Enable app CleverReach env only after old flow-side CleverReach config is confirmed inactive.
- Never have both old child flow and app API enabled.
- Do not edit solution JSON.

### Slice 5 - Deployment Env

Add CleverReach env wiring to current deployment chart:

- `deploy/chart/templates/secret.yaml`
- `deploy/chart/values.yaml`
- `deploy/stg/values-envsubst.yaml`
- `deploy/prd/values-envsubst.yaml`

Check whether `deploy/chart_new`, `deploy/stg_new`, `deploy/prd_new`, and `deploy/prd_ibw_new` are active or legacy before editing them.

Secrets live in Doppler, not repo:

- client ID
- client secret
- thesis filter ID
- sender details if not already shared

### Slice 6 - Tests And Smoke

Automated checks:

- Template rendering replaces every expected placeholder.
- Preheader avoids title and stays short.
- Receiver payload uses `filter`, not `groups`.
- Missing env skips draft creation.
- Staging guard skips draft creation unless external flows are enabled.

Manual/live smoke:

1. Staging env configured with thesis CleverReach filter.
2. Old CleverReach child flow remains inactive through its existing env config.
3. Submit one proposal publish request.
4. Confirm one draft exists in CleverReach.
5. Confirm template is `THESIS_PROPOSAL_V0`.
6. Confirm subject includes title.
7. Confirm preheader shows study level, topic area, and time frame.
8. Confirm recipients match `theses` segment.
9. Confirm no duplicate draft from Power Automate.

## Open Questions

- Actual CleverReach filter ID for `theses` segment.
- Exact placeholder syntax already present in `THESIS_PROPOSAL_V0`.
- Desired sender name/email. Old flow used `DF Community <df-community@mailing.uzh.ch>`.
- Active deployment path resolved for this change: current stg/prd Helmfiles use `deploy/chart`; `chart_new` left untouched.
- Whether app should send the existing management-inbox "draft ready" email after API draft creation, or rely on logs/CleverReach UI.

## Progress

- [x] Created worktree and branch.
- [x] Mapped thesis publish router.
- [x] Mapped Power Automate proposal and CleverReach child flows.
- [x] Compared against careers CleverReach API pattern.
- [x] Identified proposal ID/link seam.
- [x] Slice 1 done: app config and CleverReach REST client. Verified with targeted `tsc` and Prettier check.
- [x] Slice 2 done: thesis draft builder and fake-client verification script. Verified with `tsx`, targeted `tsc`, and Prettier check.
- [x] Slice 3 done: router keeps flow payload unchanged, looks up the persisted proposal created by flow, enriches labels, and triggers non-blocking CleverReach draft creation after flow success. Verified with full `tsc`, `next lint`, and fake-client script.
- [x] Slice 4 done: Power Automate solution edits removed. Duplicate prevention is an env/ops gate: old flow-side CleverReach config must remain inactive before app API env is enabled.
- [x] Slice 5 done: current Helm chart gets CleverReach env wiring; prod IBW release overrides required CleverReach values to empty. Verified stg/prd Helm renders and IBW empty override render.
- [x] Slice 6 done: final local verification, build, Helm render checks, JSON parse, whitespace check, and local security review. No high-confidence security findings.
- [ ] Confirm template placeholders and thesis filter ID.
- [x] Implement app CleverReach client/config.
- [x] Integrate with `submitProposalPublish`.
- [x] Avoid Power Automate edits.
- [x] Wire staging/production env.
- [x] Run local tests.
- [ ] Run staging smoke after `CLEVERREACH_FILTER_THESES` exists in stg and `THESIS_PROPOSAL_V0` placeholders are confirmed.

## Final Verification

- `./node_modules/.bin/prisma generate`
- `./node_modules/.bin/tsc --noEmit --incremental false --pretty false`
- `./node_modules/.bin/next lint`
- `env NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next build`
- `./node_modules/.bin/tsx scripts/verify-cleverreach-thesis.ts`
- `helm template thesis-platform deploy/chart -f deploy/stg/values-envsubst.yaml`
- `helm template thesis-platform deploy/chart -f deploy/prd/values-envsubst.yaml`
- `helm template thesis-platform deploy/chart -f deploy/prd/values-envsubst.yaml --set-string cleverreach.clientId= --set-string cleverreach.clientSecret= --set-string cleverreach.filterTheses=`
- `git diff --name-status origin/main...HEAD` to confirm no `solutions/` files are changed.
- `git diff --check origin/main...HEAD`

## Next Steps

- Add stg/prd Doppler values for CleverReach:
  - `CLEVERREACH_CLIENT_ID`
  - `CLEVERREACH_CLIENT_SECRET`
  - `CLEVERREACH_FILTER_THESES`
  - optional sender/template/subject/admin URL overrides
- Confirm old Power Automate CleverReach env params remain `EMPTY` before enabling app CleverReach env, so there is no duplicate draft.
- Run one stg proposal publish smoke with `STAGING_ENABLE_EXTERNAL_FLOWS=true`.
- Confirm one draft in CleverReach, template `THESIS_PROPOSAL_V0`, preheader metadata, and thesis-segment recipient count.
