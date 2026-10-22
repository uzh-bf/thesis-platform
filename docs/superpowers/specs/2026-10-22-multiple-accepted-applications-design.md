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
  a retried Power Automate run does not create a second entry.

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

## Power Automate

`processProposalAcceptance` keeps its response shape. `declined_users` is
now always empty, so any declined emails the acceptance flow sends from that
list no longer go out at acceptance time; the platform sends them when the
proposal is closed. The flow itself needs no change.

## Extensibility

A later group-work feature can attach several applications to one supervision
(the relation already allows it) instead of creating copies.
