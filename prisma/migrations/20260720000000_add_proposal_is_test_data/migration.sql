-- Add isTestData flag to Proposal for developer test mode (test records are
-- hidden from students/supervisors/admin views and never trigger external flows)
ALTER TABLE "Proposal" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
