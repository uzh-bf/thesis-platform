# Multiple Accepted Applications per Proposal

Date: 2026-10-22

## Purpose

Chairs can accept several applicants for one supervisor proposal, at once or
one after another. Each accepted student writes their own thesis on the same
topic, with their own status, grade and submission dates. Group work with a
shared submission is out of scope.

## Behaviour

- Accepting an application no longer declines the other applicants and no
  longer moves the proposal to `MATCHED`. The proposal stays open, so further
  applicants can be accepted.
- The supervisor closes the proposal separately with **Close proposal and
  decline remaining** (proposal page and applicant overview). This requires at
  least one accepted application, declines every application that is still
  open, sends each of them the existing declined email (with optional
  feedback) and sets the proposal to `MATCHED`.
- The accept dialog offers the same close as an opt-in checkbox ("Also close
  the proposal"), off by default. It runs after the accept request has
  responded, which only happens once the acceptance is stored. The close call
  passes the accepted application's ID and is refused unless that application
  is already `ACCEPTED`, so the student who was just accepted can never be
  declined with the rest.

## Data Model

`Proposal.parentProposalId` (nullable, `ON DELETE SET NULL`) links a proposal
copy to its original.

- The first accepted applicant uses the original proposal exactly as before:
  its supervision gets the student email, the application links to that
  supervision and an `AdminInfo` entry is created for the original proposal.
- Every further accepted applicant gets a copy of the proposal
  (`statusKey = MATCHED`, `parentProposalId` set) with its own
  `UserProposalSupervision` (same supervisor and professor) and its own
  `AdminInfo` entry. The application stays on the original proposal, so the
  applicant overview, CSV export and attachment links are unchanged, and its
  `supervisionId` points to the copy's supervision.
- Re-running an acceptance for an already accepted application is a no-op, so
  a repeated request neither creates a second entry nor emails the student
  again.

Because each accepted student has their own proposal, supervision and
`AdminInfo` row, the admin overview, XLSX export, supervision statistics and
the status automation keep working per student without changes.

## Visibility

- Students and supervisors never see the copies in their proposal lists; they
  manage everything through the original proposal.
- The admin overview resolves each entry's student through the application
  linked to that supervision, falling back to the proposal's accepted
  application for older entries without a link.
- The admin Proposals tab lists copies as separate entries and shows the
  linked student.
- Hard deleting an original proposal (developers only) also removes its
  copies.

## Acceptance and Emails

Acceptance runs in the platform. `acceptProposalApplication` checks that the
user is a developer, the proposal owner or one of its supervisors or
responsible persons, records the acceptance and sends the accepted email
through `sendMail` (to the student, CC the management inbox and the
supervisor, reply-to the supervisor). If the email cannot be sent, the
acceptance still stands and the accept dialog tells the supervisor.

Declined emails (single decline and closing the proposal) also go through
`sendMail`. A decline that could not be emailed still stands; closing the
proposal reports how many declined emails were not sent.

The Power Automate acceptance flow and its `processProposalAcceptance`
endpoint are no longer used.

## Extensibility

A later group-work feature can attach several applications to one supervision
(the relation already allows it) instead of creating copies.
