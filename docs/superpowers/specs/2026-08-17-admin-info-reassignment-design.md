# Admin Information Assignment Editing

Date: 2026-08-17

## Purpose

Allow full administrators to correct the Professor and Supervisor assigned to an
existing thesis from the Admin Information Entry Details modal.

The immediate use case is changing Samuel Meier's thesis to Professor Markus
Leippold and Supervisor Benjamin Wilding. This specification covers only the
reusable product capability. It must not automatically change Samuel Meier's or
any other existing record. An administrator will perform that change manually
after deployment.

## Scope

- Add inline Professor and Supervisor selectors to the existing Entry Details
  modal.
- Permit assignment changes only for sessions with `adminRole = ADMIN`.
- Permit changes for every Admin Information entry shown in the overview,
  including completed and archived entries.
- Save assignment changes together with other editable Admin Information fields.
- Preserve all unrelated proposal, application, and workflow data.
- Send the existing admin-change notification when an assignment changes.

## Non-goals

- No automatic or migration-based reassignment of existing records.
- No production database mutation as part of implementation or deployment.
- No assignment editing for `COORDINATOR` accounts.
- No change to proposal authorship or ownership.
- No new database table, column, or persistent audit model.
- No redesign of the Admin Information overview or workflow controls.

## Existing Model

The Admin Information overview groups rows by `Responsible`, which the interface
labels Professor. Each row represents a `UserProposalSupervision` connected to a
proposal. The same record holds:

- `responsibleId`: Professor / Person Responsible
- `supervisorEmail`: Supervisor
- the stable relation used by accepted applications through `supervisionId`

The current Entry Details modal renders Professor and Supervisor as read-only
text. Its Admin Information mutation is available to administrators and
coordinators. A separate Proposals-tab mutation can adjust assignments only for
full administrators and only for active student proposals. That restriction
does not satisfy correction of an in-progress Admin Information entry created
from another proposal type.

## User Experience

### Full administrators

For a full administrator, the existing Professor and Supervisor values in the
top details grid become searchable inline selectors.

- Each selected value and result displays name and email.
- Search matches both name and email.
- The controls have loading, empty, invalid, disabled, and visible focus states.
- The modal uses its existing Save button. No secondary dialog or separate
  assignment action is introduced.
- Save remains disabled while a request is pending or a selected value is not a
  valid option.

The controls follow the existing UZH admin interface: Source Sans typography,
UZH blue focus/action treatment, neutral borders, compact form density, and
accessible contrast. Existing product components and patterns take precedence
over introducing a new visual system.

### Coordinators

Coordinators continue to see Professor and Supervisor as read-only values. The
server rejects assignment fields submitted by a non-`ADMIN` session even if a
client request is constructed manually.

### Withdrawn entries

The current Admin Information overview excludes withdrawn entries. No new route
or editing path is added for them. All non-withdrawn entries visible through the
overview remain eligible, regardless of workflow status.

## Client Design

`AdminInfoOverview` receives the current session so it can render assignment
controls only for full administrators. Its edit state gains:

- selected Professor ID
- selected Supervisor email
- the original values, used to determine whether assignment data changed

The component reuses the existing Professor and Supervisor option queries. The
assignment selectors reuse the searchable dropdown interaction already present
in the admin Proposals tab, while remaining local to the Entry Details modal.

Saving sends assignment fields only for a full administrator. The existing
Admin Information fields and assignment fields travel in one mutation request.
On success, the modal closes and `adminGetResponsiblesOverview` refetches. A
Professor change therefore moves the row to the new Professor grouping and
updates all filtering, sorting, statistics, and XLSX export data derived from
the current supervision record.

On failure, the modal stays open, user selections remain intact, and the
existing error-alert pattern reports the server message.

## Server Design

Extend `adminUpdateAdminInfo` with optional `responsibleId` and
`supervisorEmail` fields. The procedure remains usable for ordinary Admin
Information updates by coordinators, but performs an explicit `ADMIN` check
whenever either assignment field is present.

If assignment input is supplied, the server must:

1. Require both assignment fields so partial assignments cannot be created.
2. Load the Admin Information entry and its proposal within the configured
   department boundary.
3. Verify the Professor exists in `Responsible` for the configured department.
4. Verify the Supervisor exists in `User`, belongs to the configured department,
   and has `role = SUPERVISOR`, matching the existing Supervisor option query.
5. Verify an existing `UserProposalSupervision` belongs to the proposal.
6. Update only that supervision record's `responsibleId` and
   `supervisorEmail`.
7. Apply Admin Information field updates and the supervision update in one
   Prisma transaction.

The transaction preserves:

- `Proposal.id`, type, status, and `ownedByUserEmail`
- `ProposalApplication` rows and their `supervisionId`
- `UserProposalSupervision.id`, student, and study-level values
- Admin Information workflow state except for fields explicitly edited through
  the existing form

Proposal ownership must not be changed. The existing student-proposal matching
mutation changes ownership because it performs initial matching; this feature
corrects the ongoing thesis assignment and has different semantics.

## Authorization and Integrity

- UI visibility is convenience only; server authorization is authoritative.
- Assignment editing requires `adminRole = ADMIN`.
- Existing Admin Information editing remains available under its current role
  policy.
- Professor, Supervisor, proposal, supervision, and Admin Information entry
  must all resolve inside the configured department.
- Unknown, cross-department, partial, or invalid-role assignment input fails
  without changing any record.
- The transaction prevents Admin Information fields from saving when the
  assignment update fails, and prevents the inverse partial-save case.

## Notifications

When Professor or Supervisor changes, call the existing admin-change
notification facility with:

- tab: Admin Info
- action: Change thesis assignment
- actor identity and role from the authenticated session
- proposal/Admin Information identifier
- old and new Professor and Supervisor values

No notification is sent when submitted assignment values equal current values.
Notification delivery follows existing application behavior and must not create
a second database mutation path.

## Verification

Automated coverage should verify:

- full administrators receive editable assignment controls
- coordinators receive read-only values
- a coordinator-crafted assignment request is rejected
- valid Professor and Supervisor changes succeed for an in-progress entry
- completed and archived entries can be corrected
- withdrawn entries gain no new editing path
- cross-department, missing, partial, and invalid-role targets are rejected
- proposal owner, proposal/application status, supervision ID, and application
  link remain unchanged
- an assignment validation/update failure rolls back Admin Information changes
- successful save refetches the overview and moves the row under the new
  Professor
- unchanged assignment does not emit a change notification

Implementation verification must run repository formatting, linting, type/build
checks, and a browser test of the complete full-admin flow. The browser check
must also confirm coordinators retain the read-only view.

## Deployment and Manual Follow-up

Deployment introduces only reusable code and requires no database migration.
After the release reaches the intended environment, a full administrator can
open Samuel Meier's Entry Details, select Markus Leippold and Benjamin Wilding,
save, and confirm the row appears under Markus with Benjamin shown as
Supervisor. That live data operation is explicitly outside this implementation.
