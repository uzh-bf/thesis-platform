# DF Community Signup on the Thesis Platform

## Research

### Repository freshness and source provenance

- Thesis Platform authority: `origin/main` at `a94ef79c59f5c0ba94b31c2973cc0e16112d313f`, verified on 2026-08-20. The primary checkout was clean and 0 commits ahead/behind `origin/main` when planning began.
- Planning worktree: `/Users/rschlae/Git/df/thesis-platform/trees/rs/df-community-signup` on branch `rs/df-community-signup`, created from that exact revision. This plan is the only intended local change in the current task.
- Careers authority: `origin/main` at `0faeeea0223d7a379b9ca0d04059e433ccd354ca`. The local Careers checkout was dirty, on an unrelated branch, and 11 commits behind its remote default branch, so no local working-tree content was treated as current. Reference content was read with `git show origin/main:<path>`.
- Live reference reviewed: [DF Careers for students](https://careers.df.uzh.ch/en/for-students).
- Live target reviewed: [DF Thesis Platform](https://theses.df.uzh.ch/), including desktop and mobile proposal interactions.
- Careers source seams used as the visual and form reference:
  - `src/components/PageHero.tsx`
  - `src/components/HeroSection.tsx`
  - `src/app/[locale]/(frontend)/for-students/NewsletterSignupForm.tsx`
  - `src/app/[locale]/(embed)/for-students/embed/page.tsx`
  - `messages/en.json`
  - `public/images/uzh-main-building.svg`

### Current Thesis Platform seams

- `src/pages/[[...proposalId]].tsx` owns the public proposal catalogue, the two-column desktop layout, and the fixed mobile proposal-detail overlay. It is the integration point for the banner and signup section.
- `src/pages/_app.tsx` places the header before the page and the footer after it. The signup section can therefore sit after the proposal catalogue and before the footer without changing global layout ownership.
- `src/components/IframeHeightReporter.tsx` reports document-height changes to an embedding parent. The form must remain compatible with its `ResizeObserver` behavior when validation text appears.
- `src/lib/hooks/useIsEmbedded.ts` exposes embedded mode after hydration. The new content must fit both the standalone and iframe layouts without adding another iframe.
- `src/globals.css` and `_app.tsx` already provide the UZH palette and Source Sans 3 at weights 400 and 600. No font, design-system, or CSS dependency is needed.
- `next.config.js` enables the active `analytics/MatomoTracking.tsx` only for DF webstats builds. Production DF already records page views and enables link tracking. This package adds no custom analytics event, but its new links may fall under that existing global behavior.
- `src/lib/cleverreach/*` is a server-side thesis-mailing draft facility. It is a different use case with secret-bearing server configuration and must not be imported, extended, or reused for public subscriber enrollment.
- `Dockerfile` receives public build configuration through `ARG`. The DF and IBW production images are built separately, so a public build-time feature flag can preserve IBW behavior.
- `.github/workflows/docker-image-stg-arm.yml` builds the DF staging image after an eligible `main` push and updates the staging image pin in the repository.
- `.github/workflows/docker-image-prd.yml` builds both DF and IBW production images only for the repository's release-commit/tag path, then updates production pins.
- `.github/workflows/validate.yml` currently builds the default app and migration image targets, but it does not prove the new enabled DF build or the IBW `node-runner` target.
- Playwright currently runs one Desktop Chrome project. The feature needs a focused specification and explicit mobile and iframe states, without submitting a valid request to CleverReach.

### Planning-stage review

- One required read-only `planner` review completed before this file was created.
- Corrections incorporated:
  - acknowledge existing production DF Matomo page-view and link tracking instead of describing analytics as entirely absent;
  - forbid valid CleverReach submissions in automated tests, screenshots, staging smoke, and production smoke;
  - add an aborting browser route as a failsafe around validation tests;
  - include `.github/workflows/validate.yml` and prove both enabled DF and disabled IBW image paths;
  - ensure the new controls are absent and unreachable beneath the fixed mobile proposal-detail overlay;
  - make the Careers privacy-page applicability a controller gate;
  - separate local, PR/CI, staging, production-release, and live proof.
- One review statement was corrected during integration: only the Thesis checkout was clean. The Careers working tree was intentionally not used as authority.

### Skill routing

- `rs-product-primitives` defines whether this work reuses or creates a product primitive.
- `rs-data-protection-by-design` defines the personal-data and consent gates while the form shape is still open.
- `uzh-corporate-design` fixes the visual palette, typography, form patterns, responsive margins, and accessibility baseline. The current Careers `PageHero` remains the component-level reference requested by the product owner.
- `rs-sliced-development-workflow` owns implementation slices, verification, reviews, commits, and PR readiness.
- `rs-model-routing` owns any future executor and reviewer dispatch.
- The required `writing-for-agents` skill is not installed in this environment. This plan therefore follows the repository's existing plan structure and global agent-writing rules directly; execution must not silently invent a substitute workflow.

## Plan identity

- Status: executing; the user authorized implementation in this isolated worktree on 2026-08-20. Plan, implementation, local verification, and local commits are in scope; publication and delivery remain withheld.
- Ceremony: full path. The work adds a public user-facing flow that transfers personal data to an external provider and changes DF/IBW build behavior.
- Repository: `/Users/rschlae/Git/df/thesis-platform`.
- Branch: `rs/df-community-signup`.
- Target: `main` at planning base `a94ef79c59f5c0ba94b31c2973cc0e16112d313f`.
- Packaging: one branch and one PR targeting `main`; no stack and no second repository.
- Plan: `project/2026-08-20-df-community-signup-plan.md`.
- Current authority: edit the task worktree, commit the plan and implementation slices, run local/CI-equivalent checks, and keep the goal active for user feedback.

## Execution contract

- Granted: use the existing task worktree; commit the plan as the branch's first commit; implement the approved DF Community surface; inspect the latest Careers `origin/main`; run local builds, lint, safe browser checks, and read-only review gates; update this plan's Progress section; leave the branch and goal active for feedback.
- Withheld: push, PR creation or update, merge, release tag/commit, staging or production deployment, image-pin mutation outside the local branch, CleverReach configuration changes, secret access, and any valid subscription submission.
- Terminal for this turn: local implementation and verification are complete enough for user feedback, or a genuine external gate blocks progress. Do not mark the goal complete while the user has requested it remain active.
- Pause conditions: a controller ruling changes the approved copy/data contract; a provider contract differs from the latest Careers source; implementation would require a new dependency or server-side data path; a required local check needs unavailable external infrastructure; or a delivery action would cross the withheld boundary.
- Data boundary: use only synthetic test values such as `student@example.invalid`; never submit valid data to CleverReach.

## Goal

- Promote the full DF Community from the Thesis Platform at the moment students are already considering their next academic or professional step.
- Reuse the recognizable blue Careers banner pattern and the complete DF Community subscription contract.
- Let students subscribe to any combination of general updates, DF/WWF jobs and events, external jobs and events, thesis opportunities, and teaching projects.
- Keep proposal discovery and application behavior unchanged.
- Keep IBW builds and presentation unchanged.
- Transfer subscription data directly from the student's browser to the existing CleverReach form endpoint. The Thesis Platform must not receive or store subscriber data.

## Experience and content contract

### Placement and journey

1. When the feature is enabled, render the blue community banner inside `<main>` and immediately before the existing `#proposals` section.
2. Keep the proposal catalogue in its current position and preserve its desktop sticky details panel.
3. Render the complete signup section after the proposal section and before the global footer.
4. The banner CTA links to `#df-community-signup`. Anchor navigation must land with the signup heading visible below the sticky header and must move focus predictably for keyboard users.
5. While the fixed mobile proposal-detail overlay is active, do not render the new banner or signup controls. Closing the detail view restores them without changing the selected proposal.
6. The form remains available while proposals are loading or empty because community enrollment is independent of proposal availability.

### Banner copy

- Heading: **From your thesis to your next opportunity**
- Supporting copy: **Join the DF Community for jobs, events, thesis opportunities, teaching projects and academic opportunities from the Department of Finance and selected partners.**
- Primary CTA: **Join the DF Community**
- CTA destination: `#df-community-signup` on the same page.
- Illustration: the current UZH main-building line illustration from Careers, copied as a local static asset with its original provenance preserved. It is decorative and therefore has empty alternative text or `aria-hidden="true"`.

### Signup-section copy

The following is the implementation candidate. The product owner and data controller must approve it verbatim before Slice 1 starts.

- Heading: **Join the DF Community**
- Introduction: **Choose the updates that interest you and stay connected beyond your thesis search. You can select one or more topics.**
- Frequency and withdrawal: **We send updates at most once a week. You can unsubscribe at any time using the link in any email.**
- Email label: **Email address**
- Study-start label: **Start of studies (optional)**
- Study-start placeholder: **e.g. 2024**
- Topic legend: **What would you like to hear about?**
- Topic hint: **Select one or more topics.**
- Topic error: **Please choose at least one topic.**
- Submit label: **Subscribe**
- Confirmation hint: **The confirmation page opens in a new tab. Your subscription starts only after you confirm the email from CleverReach.**
- Required hint: **Fields marked with * are required.**
- Privacy sentence: **By subscribing, you agree that we may process your data to deliver the selected DF Community updates. Details are available in the DF Careers privacy policy.**
- Optional secondary link below the explanatory copy: **Explore current jobs and events on DF Careers** → `https://careers.df.uzh.ch/en`.

### Topic labels and provider values

| Student-facing label | Submitted field | Submitted value | Default |
| --- | --- | --- | --- |
| General information from the DF Community | `tags[]` | `info` | unchecked |
| Jobs and events from the Department of Finance and WWF | `tags[]` | `df_jobs_events` | unchecked |
| Jobs and events from external partners | `tags[]` | `ext_jobs_events` | unchecked |
| Bachelor's and master's thesis opportunities | `tags[]` | `thesen` | unchecked |
| Teaching projects and academic opportunities | `tags[]` | `lehrprojekte` | unchecked |

The labels are adapted to be Thesis-neutral, but the five provider values remain exactly equal to the Careers contract. There is no thesis-only default and no hidden subscribe-all behavior.

### Form transport contract

| Concern | Required contract |
| --- | --- |
| Destination | `https://flow.cleverreach.com/fl/23d61875-1675-49c3-98bd-45d17dea2a10/confirm` |
| Method | `POST` |
| Browsing context | `target="_blank"`; preserve opener isolation where supported |
| Email | `name="email"`, `type="email"`, required |
| Study start | `name="global.studienstart"`, `type="number"`, optional |
| Topics | five `name="tags[]"` checkboxes with the values above; at least one required by client validation |
| Honeypot | `name="email_confirm"`, empty, off-screen, `tabIndex={-1}`, `autoComplete="off"`, hidden from assistive technology |
| Confirmation | existing CleverReach double-opt-in lifecycle; no Thesis success state is invented |
| Privacy | absolute link to `https://careers.df.uzh.ch/en/data-protection`, opened safely without discarding entered form state |

## Product primitives and contract deltas

| Product primitive | Decision | Contract delta |
| --- | --- | --- |
| DF Community subscription | Reuse | Add a new acquisition surface using the established topics, direct browser handoff, double opt-in, unsubscribe lifecycle, and provider ownership. |
| Subscription preferences | Reuse | Expose all five existing topic tags, require one explicit choice, and keep every topic unchecked initially. |
| Thesis proposal catalogue | Compose | Place marketing before and after the catalogue without changing proposal identity, filters, selection, application, permissions, APIs, or persistence. |
| Department build identity | Extend | Add one explicit public flag, constrained by `NEXT_PUBLIC_DEPARTMENT_NAME === 'DF'`, so the feature cannot appear in IBW by configuration drift alone. |

No new newsletter, community account, Thesis signup record, analytics primitive, or membership lifecycle is created. “Join” means subscribing to selected DF Community mailings; it does not create a Thesis Platform account.

## Architecture and data flow

### Component and configuration shape

- Add `src/lib/dfCommunity.ts` for public, non-secret constants: banner copy, form copy, provider action, privacy/Careers links, and the five topic definitions.
- Export one narrow gate such as `isDfCommunitySignupEnabled()` that returns true only when both conditions hold:
  - `NEXT_PUBLIC_ENABLE_DF_COMMUNITY_SIGNUP === 'true'`;
  - `NEXT_PUBLIC_DEPARTMENT_NAME === 'DF'`.
- Absent, empty, differently cased, or non-`true` flag values disable the feature.
- Add `src/components/DfCommunityBanner.tsx` for the blue marketing surface.
- Add `src/components/DfCommunitySignup.tsx` for the explanatory copy and full form.
- Wire both components in `src/pages/[[...proposalId]].tsx`. Do not put them in `Header`, `Footer`, `_app.tsx`, `SupervisorProposals`, or a proposal card.
- Copy the illustration to `public/uzh-main-building.svg`. Do not add a new image package or fetch it at runtime.
- Keep `src/lib/cleverreach`, `src/server`, Prisma, tRPC, Next API routes, and server logs untouched.

### Personal-data path

1. The browser renders static public copy and empty controls.
2. The student supplies an email address, may supply a study-start year, and explicitly selects one or more topics.
3. Native email validation and local topic validation run before navigation.
4. On a valid user submission, the browser posts the fields directly to the public CleverReach HTTPS endpoint in a new tab.
5. CleverReach owns confirmation, enrollment, retention, suppression, and unsubscribe handling.
6. The Thesis Platform receives no request, record, callback, provider credential, or enrollment status.

### UZH corporate-design application

- Reuse the current Careers hero composition: UZH blue surface, restrained gradient, white text, white CTA, right-aligned line illustration, and illustration removal at narrow widths.
- Use Source Sans 3 weights 400 and 600 only in the Thesis implementation, even though the current Careers hero source uses a heavier heading class.
- Use the existing Thesis content width (`max-w-[1440px]`) and responsive page margins rather than introducing a second grid system.
- Use UZH blue `#0028A5`, link blue `#365DD5`, primary text `#121212`, secondary text `#4C4C4C`, border `#E9E9E9`, and approved error colors only.
- Use semantic `section`, heading, `form`, `fieldset`, `legend`, labels, hints, and error regions.
- The attached Careers pattern and current Careers `PageHero` are the requested component reference. Its compact rounded CTA is retained rather than replacing it with an unrelated new button treatment; a corporate-design owner may overrule this before Slice 1.
- Do not change the existing header, footer, logo, global font, or proposal-card styles.

## Data protection by design

| Dimension | Planned measure | Release gate |
| --- | --- | --- |
| Amount | Require email only; keep study start optional; offer exactly five fixed topic choices; collect no name, account, proposal, application, or behavioral profile. | Controller approves every field as necessary. |
| Extent and purpose | Use data only for the topics selected by the student. No preselection, inferred interests, automatic thesis tag, enrichment, or cross-use in Thesis. | Provider mapping is reconfirmed against current Careers behavior. |
| Storage | Store nothing in the Thesis Platform. CleverReach remains responsible for enrollment, retention, suppression, and deletion. | Privacy notice states the applicable provider and retention/withdrawal arrangement. |
| Access | Data goes directly to CleverReach and the existing authorized DF subscription administrators. It is never exposed to Thesis supervisors, proposal owners, or public pages. | Controller confirms the current administrative-access model. |
| Lawfulness | Do not infer legal basis or whether a separate consent checkbox is required. | Controller approves the basis, wording, processor arrangement, rights contact, and withdrawal path before implementation. |
| Fairness | Make study start visibly optional. Leave all topics unchecked. Do not make subscription a condition of browsing or applying for a thesis. | UX review confirms no coercive or misleading copy. |
| Transparency | Explain selected-topic delivery, maximum frequency, unsubscribe, external confirmation/new tab, double opt in, provider handoff, and privacy policy before submit. | Exact inline copy and the Careers privacy-page applicability are approved verbatim. |
| Accuracy | Use native email validation, numeric study-start input, fixed tag values, and the provider's confirmation step. | Contract tests cover types, names, values, and optionality. |
| Security | Use the exact HTTPS endpoint; no secrets, app proxy, API route, or database; keep the honeypot; prevent opener access where supported. | Code review confirms the browser is the only data path. |
| Accountability | Record source revisions, controller decisions, no-network tests, review reports, and evidence separately for local, CI, staging, and production. | PR description links the approved plan and evidence without personal data. |

### Existing analytics boundary

- Do not add Matomo events, form-field tracking, conversion tracking, email values, selected topics, or custom dimensions.
- Keep the current global DF Matomo implementation unchanged. Its existing page views and link tracking remain part of the host site's current behavior; new external links may therefore be recorded under that existing policy.
- If the product owner requires the new links to be excluded from existing link tracking, treat that as a separate analytics and privacy decision before implementation.

## Assumptions and open gates

| Gate | Recommendation | Required ruling |
| --- | --- | --- |
| Controller and privacy notice | Reuse the existing Careers policy only if it expressly covers a form hosted on the Thesis Platform, the optional study-start field, the five preferences, CleverReach, double opt in, retention, frequency, unsubscribe, and rights contact. | Data controller approval before Slice 1. |
| Exact copy | Use the English candidate in this plan because the current Thesis page is English-only. | Product owner and controller approve verbatim before Slice 1. |
| Provider contract | Reuse the current Careers endpoint and tags without a live enrollment test. | Newsletter owner reconfirms endpoint, fields, tag meanings, honeypot, and confirmation configuration before Slice 3. |
| Existing analytics | Accept existing sitewide DF behavior and add no instrumentation. | Product owner confirms no special exclusion is required. |
| CTA radius | Preserve the requested current Careers pattern and existing Thesis control language. | Corporate-design owner may overrule before implementation; no other visual decision depends on it. |
| Merge side effect | A qualifying merge to `main` triggers a staging image build and repository image-pin update. | Merge authority must explicitly acknowledge that delivery effect. |

## Non-goals

- Do not create a thesis-only mailing list, default topic, or campaign.
- Do not create a Thesis Platform account or community profile.
- Do not proxy the form through tRPC, a Next API route, server action, Prisma, or `src/lib/cleverreach`.
- Do not store emails, study-start years, preferences, consent evidence, or provider responses in the Thesis database or logs.
- Do not embed Careers or CleverReach in an iframe.
- Do not add a dependency, shared package, CMS, translation framework, analytics event, or experimentation framework.
- Do not redesign the header, footer, proposal catalogue, application journey, mobile proposal overlay, or IBW branding.
- Do not add “select all” unless the same behavior is first approved for the canonical Careers form.
- Do not perform a valid provider submission during development, tests, review, screenshots, staging smoke, or production smoke.
- Do not commit, push, open a PR, merge, release, deploy, or modify provider configuration without the separately named authority.

## Feature-wide test portfolio

| Independent risk | Test change | Primary seam | Why this is the primary evidence |
| --- | --- | --- | --- |
| Feature appears in IBW or when disabled | Assert the two-condition gate; run a disabled browser state; build enabled DF `app` and disabled IBW `node-runner` targets in PR validation. | `src/lib/dfCommunity.ts`, Playwright, `Dockerfile`, `validate.yml` | Exercises both presentation and build boundaries. |
| Provider contract drifts | Assert form action, method, target, field names, required/optional state, five tag values, no checked defaults, and the honeypot from the rendered DOM. | `tests/e2e/df-community-signup.spec.ts` | Protects the public wire contract without duplicating implementation-only tests. |
| A test enrolls a recipient | Never submit a valid form. Inspect synthetic `FormData` directly; install an aborting route for the CleverReach origin before every submit-path test. | Playwright route interception | A regression cannot leave the browser even if validation fails open. |
| Topic validation is inaccessible | Fill a synthetic `.invalid` email, submit with no topics, assert no request, visible/described error, `aria-invalid`, and focus on the first checkbox. | Browser behavior | Covers the custom validation path and assistive-technology contract. |
| Native email validation regresses | Submit an empty or malformed email with a topic selected while the provider route is aborted; assert native invalid state and no request. | Browser behavior | Keeps email validation in the native control rather than reimplementing it. |
| Placement or anchor breaks proposal browsing | Assert banner precedes `#proposals`, signup follows it, CTA resolves to the signup heading, and selected proposal/filter state remains unchanged. | Landing-page Playwright test | Covers the composed journey at the user-visible seam. |
| Mobile overlay exposes hidden controls | Open a seeded proposal at 390×844; assert the new banner/form are absent from the accessibility tree and tab order until “Back to proposals” is activated. | Seeded DF E2E state | Protects the fixed-overlay interaction without redesigning existing modal behavior. |
| Embedded form causes nested scrolling or stale height | Load the app in a same-origin iframe; assert compact layout, no horizontal overflow, and a new resize message after validation text appears. | `IframeHeightReporter` plus Playwright frame | Exercises the actual embed contract rather than a query-string simulation. |
| Visual or accessibility regressions | Browser-check desktop, mobile overview, mobile detail, embedded default, embedded error, 200% zoom, keyboard order, focus ring, heading hierarchy, labels, contrast, and decorative SVG treatment. | Real Chromium and screenshots | These properties are not fully protected by DOM assertions alone. |
| Existing proposal and application behavior changes | Run the complete existing Playwright suite and confirm no server, Prisma, or proposal API diff. | Existing E2E suite plus diff inspection | Preserves the product primitive being composed with the new surface. |
| Build or release configuration diverges | Keep migration-target validation; add explicit DF `app` and IBW `node-runner` image builds with their expected args; inspect production workflow diffs. | `.github/workflows/validate.yml` and image workflows | CI proves each image class before merge; live proof remains separate. |

### Test-data rules

- Use only reserved synthetic addresses such as `student@example.invalid`.
- Do not use a real name, email, study identifier, or enrollment record.
- Do not include filled email values in screenshots, traces, videos, logs, or committed fixtures.
- Build `FormData` in the page and inspect key/value pairs without dispatching a valid submit.
- Abort every request matching the CleverReach origin before interacting with submit controls. Treat any intercepted request as a test failure, even if the abort succeeds.
- Do not weaken this rule for staging or production smoke. Live smoke verifies rendering, links, validation barriers, and provider-contract attributes only.

## Delegation Map

| Work item | Route | Dependency | Acceptance check | Reason for route |
| --- | --- | --- | --- | --- |
| Plan construction and integration | Main session | Current research and planner review | This file is complete, internally consistent, and the worktree contains no unrelated change. | Architecture, data-flow, product, and authority decisions remain main-session responsibilities. |
| Slice 1: subscription tracer | Main session | Controller copy/privacy ruling | Enabled and disabled local states, exact form contract, no-network validation, and proposal-state preservation pass. | Critical-path integration crosses the personal-data boundary. |
| Slice 2: responsive/embed/a11y hardening | Native `executor` | Slice 1 committed and immutable | Desktop, mobile, overlay, iframe, keyboard, and screenshot checklist passes; main session verifies the patch. | Bounded UI seam with an independent write set after core decisions are fixed. |
| Slice 3: DF/IBW build isolation | Main session | Slices 1–2 reviewed; provider contract reconfirmed | DF-enabled and IBW-disabled targets pass locally or in CI; migration validation is retained. | Release workflow and cross-deployment coupling stay with the main session. |
| Slice reviews | `simplifier` plus one risk-selected `slice-reviewer` per substantive committed slice | Exact committed slice range | Findings are verified and resolved or rejected with evidence before the next slice. | Required workflow gates; the same immutable range is reviewed in parallel. |
| Integrated finish | `final-reviewer` | All slice checks green and branch integrated | Correctness, plan compliance, maintainability, architecture, data flow, accessibility, and IBW isolation pass. | Required final gate for the complete committed package. |

Before any future dispatch, exclude `.env*`, real recipient data, provider secrets, unrelated private material, and `project/_local/` screenshots from the prompt and report scope.

## Delivery topology and slice order

- One implementation branch: `rs/df-community-signup`.
- One PR target: `main`.
- Slice 1 is the tracer bullet: a student can see the adapted banner, reach the full form, inspect every topic, and exercise safe validation under an explicit local DF flag.
- Slice 2 hardens all presentation modes without changing the provider or build contract.
- Slice 3 enables the already-reviewed feature only in DF image workflows and proves IBW isolation.
- Do not start Slice 1 until the copy/privacy gate is resolved. Do not start Slice 3 until the provider-contract gate is resolved.

## Slice 1 — Add the DF-only local subscription journey

### Route

- Owner: main session.
- Risk boundary: public personal-data handoff and product integration.
- Review: parallel `simplifier` and data-flow/security `slice-reviewer` after the substantive commit.

### Files and modules

- Add `src/lib/dfCommunity.ts`.
- Add `src/components/DfCommunityBanner.tsx`.
- Add `src/components/DfCommunitySignup.tsx`.
- Add `public/uzh-main-building.svg` from the pinned Careers source.
- Update `src/pages/[[...proposalId]].tsx`.
- Update `.env.local.template` with `NEXT_PUBLIC_ENABLE_DF_COMMUNITY_SIGNUP=false` and no secret value.
- Update `playwright.config.ts` and/or package scripts only as needed to launch isolated enabled and disabled E2E states without a reused server.
- Add `tests/e2e/df-community-signup.spec.ts`.

### Implementation obligations

- Centralize the public contract and topic list; do not duplicate provider values between components.
- Gate rendering on exact flag true and exact department `DF`.
- Render the banner before proposals and the form after proposals.
- Keep the full form locally rendered and accessible; do not iframe Careers.
- Preserve the direct browser POST contract and new-tab confirmation behavior.
- Use controlled state only for the topic-error presentation. Do not store the email, study start, or selected topics in React state, analytics, logs, URL parameters, or browser storage.
- Clear the topic error when any topic becomes checked.
- Keep all topics unchecked and study start empty.
- Do not render the banner/form while the mobile detail overlay is active.
- Keep the form independent of proposal loading and empty results.

### Behavioral acceptance

- With the flag absent or false, the rendered page is byte-for-behavior equivalent around the proposal catalogue and contains no community banner/form.
- With the flag true but department `IBW`, the feature remains absent.
- With flag true and department `DF`, the exact approved banner and form copy appears.
- CTA navigation reaches and focuses the signup heading without changing route, filters, selected proposal, or scroll state inside the desktop detail panel.
- The DOM contains the exact provider contract in this plan.
- A missing topic prevents submit, announces the error, and focuses the first topic.
- Selecting a topic clears the error.
- Native email validation remains active.
- No code in the slice imports `src/lib/cleverreach`, `src/server`, Prisma, or tRPC for signup.

### Test obligation

- Add rendered-contract assertions for all fields and values.
- Add enabled DF, disabled flag, and IBW-defense assertions using isolated server/build configurations.
- Add native email and topic-validation cases with provider-route abortion installed first.
- Inspect synthetic `FormData` without dispatching a valid submit.
- Assert an intercepted provider request fails the test.
- Run `pnpm lint`.
- Run the repository build with the feature disabled and enabled for DF.
- Run the targeted Playwright specification in both enabled and disabled modes.
- Run `git diff --check` and inspect every hunk for task ownership.

### Browser check

- Desktop Chrome at 1280×720: banner, proposal catalogue, anchor destination, complete form, and validation error.
- Confirm the form can be completed by keyboard but stop before a valid submit.
- Confirm external links open safely and preserve entered local form values.
- Save evidence under ignored `project/_local/df-community-signup/`; never stage screenshots.

### Commit boundary

- Tentative commit: `feat(community): add DF Community signup journey`.
- Commit only after checks and reviews pass and only if commit authority is explicitly granted.

## Slice 2 — Harden responsive, embedded, and accessible behavior

### Route

- Owner: native `executor` with a disjoint write scope limited to the two new components, the landing-page presentation seam, the focused E2E spec, and ignored local screenshots.
- Main session owns prompt privacy screening, patch verification, integration, and findings.
- Review: parallel `simplifier` and accessibility/embedded-regression `slice-reviewer` after the substantive commit.

### Files and modules

- `src/components/DfCommunityBanner.tsx`.
- `src/components/DfCommunitySignup.tsx`.
- `src/pages/[[...proposalId]].tsx` only where mobile-overlay visibility requires it.
- `tests/e2e/df-community-signup.spec.ts`.
- Inspect but do not casually change `src/components/IframeHeightReporter.tsx`, `src/lib/hooks/useIsEmbedded.ts`, `src/globals.css`, Header, or Footer.

### Implementation obligations

- Banner: edge-to-edge only where the current page grid permits, constrained to the existing maximum width, UZH blue, 600-weight heading, readable line length, white CTA, decorative illustration hidden at narrow widths.
- Form: one column on mobile, two-column email/study-start row when space permits, two-column topic grid only when labels remain readable, and a clear single-column fallback.
- Avoid horizontal overflow at 320px and 390px.
- Preserve a logical heading hierarchy under the page's current headings.
- Keep all labels programmatically associated; use a fieldset/legend for topics; connect hints and errors through `aria-describedby`; announce the error without a duplicate alert storm.
- Preserve visible focus, 44px practical pointer targets where possible, WCAG AA contrast, and keyboard order.
- The decorative SVG must not be announced.
- In iframe mode, avoid a second fixed viewport or nested scrollbar. Validation-state growth must cause a new height report.
- While mobile proposal details are open, the new controls must be absent from the accessibility tree and keyboard sequence. Do not broaden this slice into a redesign of the existing overlay.

### Behavioral acceptance

- Desktop, 390px mobile, 320px narrow mobile, and same-origin iframe states have no horizontal overflow.
- Text does not overlap the illustration or CTA at 200% browser zoom.
- The mobile illustration is hidden without leaving empty layout space.
- Error appearance does not move focus away from the first topic and does not obscure the fieldset.
- Opening a proposal on mobile removes the new controls from reach; closing it restores the overview at a sensible position.
- Embedded validation changes the reported height and does not create double scrolling.
- Existing header/footer compact embedded behavior remains unchanged.

### Test obligation

- Extend the focused Playwright spec for mobile overview and seeded mobile detail.
- Add a same-origin iframe harness inside the test, not a production-only query parameter or route.
- Assert resize messages before and after showing the topic error.
- Run the targeted spec and the complete existing E2E suite.
- Run `pnpm lint`, the DF-enabled build, `git diff --check`, and owned-file formatting checks.
- Conduct a keyboard-only pass and 200% zoom pass in real Chromium.

### Browser evidence

- Desktop default and error states.
- Mobile overview and mobile proposal-detail overlay.
- Embedded default and embedded error states.
- Store screenshots in `project/_local/df-community-signup/` with synthetic fields empty.

### Commit boundary

- Tentative commit: `fix(community): harden responsive signup behavior` if the slice corrects observed defects; otherwise use the smallest accurate conventional type.
- Commit only after checks and reviews pass and only with explicit commit authority.

## Slice 3 — Enable DF images and prove IBW isolation

### Route

- Owner: main session.
- Risk boundary: release configuration, staging side effects after merge, and cross-deployment isolation.
- Review: parallel `simplifier` and release/IBW `slice-reviewer` after the substantive commit.

### Files and modules

- `Dockerfile`.
- `.github/workflows/docker-image-stg-arm.yml`.
- `.github/workflows/docker-image-prd.yml`.
- `.github/workflows/validate.yml`.
- Update the plan's Progress section with evidence; do not add deployment secrets or provider credentials.

### Implementation obligations

- Add `ARG NEXT_PUBLIC_ENABLE_DF_COMMUNITY_SIGNUP=false` in the builder stage before `pnpm run build`.
- Pass `NEXT_PUBLIC_ENABLE_DF_COMMUNITY_SIGNUP=true` only to the DF staging and DF production application builds.
- Pass `false` explicitly to the IBW production `node-runner` build for readable defense in depth.
- Keep the runtime gate's `NEXT_PUBLIC_DEPARTMENT_NAME === 'DF'` check even when workflow args are correct.
- Preserve every existing build arg, image target, migration image, release trigger, image-pin update, and concurrency rule.
- Extend PR validation without removing the migration-target build:
  - build the DF `app` target with department `DF` and signup enabled;
  - build the IBW `node-runner` target with department `IBW` and signup disabled;
  - keep the `migration-runner` target check.
- Do not add provider reachability checks or live form submissions to CI.

### Behavioral acceptance

- A default build remains disabled.
- The DF staging and production application artifacts contain the enabled feature.
- The IBW production artifact does not render the feature even if one of the two safeguards drifts.
- PR validation exercises all three relevant image targets without changing published artifacts.
- `pnpm-lock.yaml`, package dependencies, server code, Prisma, and analytics code remain unchanged.
- Workflow changes do not themselves publish, push, or deploy during local verification.

### Test obligation

- Run `pnpm lint` and the full Playwright suite.
- Build the app locally with DF/enabled args and verify the enabled page without a valid provider submit.
- Build the app or `node-runner` path with IBW/disabled args and verify the feature is absent.
- Run or rely on PR CI for the native ARM image matrix when local ARM-equivalent Docker proof is unavailable; report the evidence layer accurately.
- Inspect workflow diffs line by line and run `git diff --check`.
- Scan staged content for credentials and personal data before any future commit.

### Browser check

- Compare final local DF-enabled and IBW-disabled artifacts at desktop and mobile widths.
- Verify only rendering, links, field contract, and blocked invalid submissions. Never complete enrollment.

### Commit boundary

- Tentative commit: `ci(community): enable signup in DF image builds`.
- Commit only after checks and reviews pass and only with explicit commit authority.

## Integrated finish gate

Before calling the implementation PR-ready:

1. Re-fetch `origin/main`; report branch ahead/behind and rebase only with the required authority and a clean understanding of conflicts.
2. Run `pnpm lint`, the applicable production builds, targeted community E2E in enabled and disabled modes, and the complete E2E suite.
3. Prove enabled DF and disabled IBW image targets in PR CI while retaining migration validation.
4. Inspect the complete diff for scope, comments, generated changes, secrets, personal data, and accidental form submissions.
5. Run one integrated `final-reviewer` on the complete committed range with correctness, plan compliance, maintainability, architecture, security/data flow, accessibility, and IBW-isolation lenses.
6. Resolve or explicitly reject verified review findings before updating or creating a PR.
7. Produce a screenshot set with no filled personal-data fields.
8. Update this plan's Progress and evidence by layer. A green local or CI check is not staging or production proof.

## Rollout, rollback, and authority boundaries

### Current boundary

- Authorized now: the local uncommitted plan file in the task worktree and read-only verification.
- Not authorized now: implementation edits, commits, pushes, PR creation, merge, release commit/tag, image publication, repository image-pin update, deployment, CleverReach configuration changes, or any live subscription.

### Future publication and delivery gates

| Layer | Trigger or action | Required authority | Evidence required |
| --- | --- | --- | --- |
| Local | Implement and run local checks | Explicit implementation authority; commit remains separate | Commands, outcomes, diff inspection, screenshots |
| PR/CI | Push branch and open/update PR | Explicit push and PR authority | Green quality, DF app, IBW node-runner, migration target, reviews |
| Staging desired state | Merge an eligible change to `main`; current workflow builds/publishes and commits the staging image pin | Explicit merge authority acknowledging this side effect | Workflow conclusion, image digest/tag, pin commit, deployed revision |
| Staging live proof | Observe or exercise deployed staging | Explicit environment/deployment authority where required | Exact deployed revision and browser checks; no valid enrollment |
| Production release | Create the repository's authorized release commit/tag path; current workflow builds DF and IBW and updates production pins | Explicit release and production authority | Both image jobs, both pins, release artifact, rollback target |
| Production live proof | Observe the live DF and IBW sites | Explicit production smoke authority | DF enabled, IBW absent, exact revisions, no valid enrollment |

Re-check workflow triggers and remote revisions immediately before publication because this plan records the 2026-08-20 snapshot only.

### Rollback

- Before merge: close or revise the PR; no user data or deployment exists.
- Staging: revert the feature/config commits or rebuild the DF artifact with the flag false, then let the normal staging path update the image pin.
- Production: use the repository's approved rollback to the previous known-good DF image or issue a new reviewed release with the flag false. Do not mutate live containers or patch GitOps state manually.
- A build-time flag cannot be disabled by changing a runtime environment variable on an already-built image.
- Rollback hides the Thesis acquisition surface only. It does not remove subscriptions already held by CleverReach and is not a data-deletion mechanism.
- Provider endpoint or topic drift before release blocks enablement; it does not authorize editing CleverReach.

## Progress

- [x] Thesis primary checkout freshness and clean state verified.
- [x] Careers remote source pinned and inspected without trusting its dirty local checkout.
- [x] Live Careers and Thesis desktop/mobile experiences reviewed.
- [x] Banner placement, community-wide scope, CTA, and complete form reuse settled with the product owner.
- [x] Product primitive and personal-data boundaries mapped.
- [x] Required planning-stage review completed and corrections integrated.
- [x] Isolated task branch/worktree created.
- [x] Complete implementation plan written locally.
- [ ] Product owner and controller approve exact copy, privacy applicability, frequency, unsubscribe, and double-opt-in wording.
- [ ] Product owner confirms existing global Matomo behavior needs no special exclusion.
- [ ] Slice 1 implemented, verified, reviewed, and committed under separate authority.
- [ ] Slice 2 implemented, verified, reviewed, and committed under separate authority.
- [ ] Newsletter owner reconfirms the provider action and five tag values without a live enrollment.
- [ ] Slice 3 implemented, verified, reviewed, and committed under separate authority.
- [ ] Integrated final review and PR-ready checks pass.
- [ ] Branch publication and PR creation separately authorized.
- [ ] Merge/staging delivery separately authorized and evidenced.
- [ ] Production release and live proof separately authorized and evidenced.

## Completion criteria

### PR-ready

- The approved English copy exposes all five community dimensions and does not imply a thesis-only mailing or a platform account.
- The feature is present only when both the explicit flag and DF department identity are true.
- The form exactly matches the approved public CleverReach contract and the Thesis Platform has no subscriber-data path.
- No topic is preselected; at least one is required accessibly; native email validation remains intact.
- Automated and manual verification made zero valid CleverReach submissions and used no real personal data.
- Desktop, mobile, mobile-detail, embedded, keyboard, zoom, and error states pass with screenshot evidence.
- Existing proposal browsing, selection, application, iframe resizing, header, and footer behavior remain unchanged.
- PR validation proves DF-enabled, IBW-disabled, and migration image targets.
- Slice reviews and the integrated final review have no unresolved material finding.
- The complete diff contains no unrelated change, secret, credential, real email, or unignored screenshot.

### Delivery complete

- PR-ready criteria remain true at the exact merged revision.
- Staging workflow, image publication, desired-state pin, deployed revision, and no-submit browser smoke are each evidenced.
- Production release builds and pins both DF and IBW artifacts successfully.
- Live DF shows the feature and live IBW does not, at the exact deployed revisions.
- Rollback target is recorded.

Until those delivery checks are separately authorized and proven, report the work as `delivery_pending`, not complete.
