# Thesis CleverReach API Migration Plan

Date: 2026-07-02
Branch: `codex/thesis-cleverreach-api`

## Goal

Move thesis proposal CleverReach draft creation from Power Automate child flow into the Next.js app, using the same API-based pattern that worked in `careers`.

Scope stays narrow:

- Keep Power Automate as proposal workflow owner for now: PDF persistence, `addProposal`, supervision assignment, supervisor confirmation email.
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

Keep proposal publish flow, but app generates proposal ID.

Reason:

- CleverReach template needs proposal link.
- Flow currently generates `ProposalId` internally, and `submitProposalPublish` cannot reliably know it.
- Smallest stable fix: app creates `proposalId`, includes it in Power Automate payload, flow uses `triggerBody()?['proposalId']` when present, fallback to `guid()` for compatibility.

Flow change:

```text
SetProposalId = coalesce(triggerBody()?['proposalId'], guid())
```

App then knows link before CleverReach draft creation:

```text
{ROOT_URL}/{proposalId}
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

- Generate `proposalId` in app.
- Add `proposalId` to Power Automate payload.
- After successful Power Automate response, trigger CleverReach draft creation.
- If CleverReach env is incomplete, skip with clear log.
- If CleverReach call fails, log and keep proposal publish success.
- Reuse staging guard: no external CleverReach draft in staging unless `STAGING_ENABLE_EXTERNAL_FLOWS=true`.

### Slice 4 - Power Automate De-Dupe

Prevent duplicate drafts.

Options:

1. Disable old CleverReach branch by setting flow CleverReach env params to `EMPTY`.
2. Remove or no-op `IsCleverreachConfigured` in solution JSON.

Preferred rollout path:

- Staging: disable old child flow path first, then enable app CleverReach env.
- Production: same order. Never have both old child flow and app API enabled.

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
2. Old CleverReach child flow disabled.
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
- Active deployment path: old `deploy/chart` only, or also `deploy/chart_new`.
- Whether app should send the existing management-inbox "draft ready" email after API draft creation, or rely on logs/CleverReach UI.

## Progress

- [x] Created worktree and branch.
- [x] Mapped thesis publish router.
- [x] Mapped Power Automate proposal and CleverReach child flows.
- [x] Compared against careers CleverReach API pattern.
- [x] Identified proposal ID/link seam.
- [x] Slice 1 done: app config and CleverReach REST client. Verified with targeted `tsc` and Prettier check.
- [x] Slice 2 done: thesis draft builder and fake-client verification script. Verified with `tsx`, targeted `tsc`, and Prettier check.
- [x] Slice 3 done: router now generates proposal ID, passes it to flow, enriches labels, and triggers non-blocking CleverReach draft creation after flow success. Verified with full `tsc`, `next lint`, and fake-client script.
- [x] Slice 4 done: Power Automate accepts app `proposalId`, uses it with `guid()` fallback, and old CleverReach child branch is disabled to prevent duplicate drafts. Verified solution JSON with `jq`.
- [ ] Slice 5 in progress: deployment env wiring.
- [ ] Confirm template placeholders and thesis filter ID.
- [x] Implement app CleverReach client/config.
- [x] Integrate with `submitProposalPublish`.
- [x] Disable old flow CleverReach branch.
- [ ] Wire staging/production env.
- [ ] Run local tests and staging smoke.
