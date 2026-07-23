-- Developer test data has been removed manually before deployment. Staging now
-- exercises the same proposal lifecycle as production.
ALTER TABLE "Proposal" DROP COLUMN "isTestData";
