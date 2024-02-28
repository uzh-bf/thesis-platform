# Upgrade Notes

## Sharepoint-Changes

- Made every column consistent with their real ("deep") column name --> see [Thesis Supervisors List](https://uzh.sharepoint.com/sites/UZHBFThesisPlatformDEV/Lists/Thesis%20Supervisors/AllItems.aspx) + removed Topic Areas List:
  - Show "ID" column
  - Email (Title) -> Email
  - Name (field_1) -> Name
  - SupervisionMandatory (field_2) -> SupervisionMandatory
  - Languages (field_3) -> Languages
  - Comments (field_4) -> Comments
- Added Column "EmailNotification" to opt out/in of email notifications when a student posts a proposal in your topic area
- AreasOfInterestV2 deleted and merged to AreasOfInterest (without second list necessary)

## DB-Changes (run Migration)

- Add Comment from student into Frontend (non-required question from last page of Submit Thesis Proposal)

## Flow/Solution Changes

### Thesis Application Acceptance:

- Included Supervisor in CC for Confirmation mail
- Email Subject/Body: Department variable added
- Add name/email of supervisor to application acceptance email

### Thesis Proposal Application:

- Email Subject: Department variable added

### Thesis Proposal Feedback:

- Email Subject/Body: Department variable added
- Email Body: Replaced field_1 with email in earlier deployments

### Thesis Proposal Posting:

- Link to Proposal in Confirmation Email fixed
- Switched to Group Forms:
  - updated form link in settings file
  - replaced OneDrive connector with SharePoint connector
- Added missing functionality for Further Attachments & Comments
- Update filter to check for "Name" instead of "field_1"
- SupervisorConfirmationEmail:
  - Email Subject/Body: Department variable added
  - Email Body: Root Url added & link adjusted
- Update filter to check for "Name" instead of "field_1":
  - Changed "deep" column name to "Name" instead of "field_1"

### Thesis Proposal Submission:

- Switched to Group Forms:
  - updated form link in settings file
  - replaced OneDrive connector with SharePoint connector
- Added missing functionality for Further Attachments & Comments
- EmailToSupervisors:
  - Email Subject: Department variable added
- StudentConfimationEmail:
  - Email Subject/Body: Department variable added

## App Changes

- Filtering of proposals added
- Accept supervision for multiple supervisor proposal applicants
- Display student e-mail on student proposal (to supervisors)
- Add Comment from student into Frontend (non-required question from last page of Submit Thesis Proposal)
