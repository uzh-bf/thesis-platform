/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `ApplicationAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `ProposalApplication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `ProposalAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `TopicArea` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `UserProposalFeedback` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `UserProposalSupervision` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- CreateIndex
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_id_key] UNIQUE NONCLUSTERED ([id]);

-- CreateIndex
ALTER TABLE [dbo].[ApplicationAttachment] ADD CONSTRAINT [ApplicationAttachment_id_key] UNIQUE NONCLUSTERED ([id]);

-- CreateIndex
ALTER TABLE [dbo].[ProposalApplication] ADD CONSTRAINT [ProposalApplication_id_key] UNIQUE NONCLUSTERED ([id]);

-- CreateIndex
ALTER TABLE [dbo].[ProposalAttachment] ADD CONSTRAINT [ProposalAttachment_id_key] UNIQUE NONCLUSTERED ([id]);

-- CreateIndex
ALTER TABLE [dbo].[TopicArea] ADD CONSTRAINT [TopicArea_id_key] UNIQUE NONCLUSTERED ([id]);

-- CreateIndex
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_id_key] UNIQUE NONCLUSTERED ([id]);

-- CreateIndex
ALTER TABLE [dbo].[UserProposalFeedback] ADD CONSTRAINT [UserProposalFeedback_id_key] UNIQUE NONCLUSTERED ([id]);

-- CreateIndex
ALTER TABLE [dbo].[UserProposalSupervision] ADD CONSTRAINT [UserProposalSupervision_id_key] UNIQUE NONCLUSTERED ([id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
