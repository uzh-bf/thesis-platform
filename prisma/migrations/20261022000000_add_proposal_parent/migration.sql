-- Proposals can accept more than one applicant. Each additional accepted
-- applicant gets a copy of the proposal that links back to the original.
ALTER TABLE "Proposal" ADD COLUMN "parentProposalId" TEXT;

CREATE INDEX "Proposal_parentProposalId_idx" ON "Proposal"("parentProposalId");

ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_parentProposalId_fkey" FOREIGN KEY ("parentProposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
