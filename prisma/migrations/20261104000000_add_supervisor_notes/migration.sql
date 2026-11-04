-- Internal admin notes on supervisors, replacing the comment column of the
-- SharePoint "Thesis Supervisors" list.
ALTER TABLE "User" ADD COLUMN "supervisorNotes" TEXT;
