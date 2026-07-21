# Unique Application Upload Names

## Problem

Application uploads currently use deterministic blob names derived from the
applicant email and document type, such as `student@uzh.ch-transcript.pdf`.
Multiple applications from the same address therefore overwrite the same blob.
The normal Power Automate application flow copies the uploaded files to
SharePoint and deletes those blob names afterward. That deletion can also remove
a file referenced by a developer-test application.

## Scope

Use collision-resistant blob names for both normal student applications and
developer-test applications. Preserve the existing lifecycle:

- Developer-test uploads remain in Azure Blob Storage because developer-test
  submissions do not invoke Power Automate.
- Normal uploads are passed to Power Automate using their exact generated blob
  names, copied to SharePoint, and deleted from Blob Storage by the existing
  workflow.
- Existing attachment records and already missing blobs are not migrated or
  restored.

## Design

Add a shared filename helper that generates flat blob names in this form:

`<proposal-id>-<uuid>-<document-type>.pdf`

The UUID prevents collisions across applications and repeated uploads. The
proposal ID aids operational tracing. Omitting the applicant email avoids
placing personally identifiable information in new storage keys. Flat names
avoid introducing folder-path behavior into the existing Power Automate flow.

`ApplicationForm` generates a new name for each selected file and uploads the
file under that name. The same exact name is stored in the form field.

For normal submissions, `submitProposalApplication` sends the generated CV and
transcript names to Power Automate unchanged. Its existing copy and delete steps
therefore operate on the unique blob names without workflow changes.

For developer-test submissions, `submitProposalApplication` stores attachment
URLs using those generated names. The authenticated attachment endpoint signs
the persisted blob name when a developer opens the document. No external flow
runs, so the blob remains available.

## Error Handling

Upload and submission error behavior remains unchanged. A failed upload does not
set the generated name into Formik. A successful upload followed by a failed
submission can leave an orphan blob, matching current behavior; orphan cleanup
is outside this change.

## Verification

- Unit-test filename shape, document-type suffix, proposal association, UUID
  uniqueness, and absence of the applicant email.
- Run targeted unit tests and TypeScript checks.
- Confirm normal submissions still pass the exact generated names to the
  existing Power Automate payload.
- Confirm developer-test attachment URLs use the persisted unique names.

