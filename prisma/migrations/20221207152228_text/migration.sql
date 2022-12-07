/*
  Warnings:

  - You are about to alter the column `description` on the `Proposal` table. The data in that column could be lost. The data in that column will be cast from `NVarChar(1000)` to `Text`.
  - You are about to alter the column `motivation` on the `ProposalApplication` table. The data in that column could be lost. The data in that column will be cast from `NVarChar(1000)` to `Text`.
  - You are about to alter the column `comment` on the `UserProposalFeedback` table. The data in that column could be lost. The data in that column will be cast from `NVarChar(1000)` to `Text`.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Account] ADD [ext_expires_in] INT;

-- AlterTable
ALTER TABLE [dbo].[Proposal] ALTER COLUMN [description] TEXT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[ProposalApplication] ALTER COLUMN [motivation] TEXT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[UserProposalFeedback] ALTER COLUMN [comment] TEXT NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
