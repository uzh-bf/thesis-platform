BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ProposalStatus] (
    [key] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ProposalStatus_pkey] PRIMARY KEY CLUSTERED ([key]),
    CONSTRAINT [ProposalStatus_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[ApplicationStatus] (
    [key] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ApplicationStatus_pkey] PRIMARY KEY CLUSTERED ([key]),
    CONSTRAINT [ApplicationStatus_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[ProposalType] (
    [key] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ProposalType_pkey] PRIMARY KEY CLUSTERED ([key]),
    CONSTRAINT [ProposalType_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[ProposalFeedbackType] (
    [key] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ProposalFeedbackType_pkey] PRIMARY KEY CLUSTERED ([key]),
    CONSTRAINT [ProposalFeedbackType_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[Account] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [providerAccountId] NVARCHAR(1000) NOT NULL,
    [refresh_token] TEXT,
    [refresh_token_expires_in] INT,
    [access_token] TEXT,
    [expires_at] INT,
    [token_type] NVARCHAR(1000),
    [scope] NVARCHAR(1000),
    [id_token] TEXT,
    [session_state] NVARCHAR(1000),
    CONSTRAINT [Account_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Account_provider_providerAccountId_key] UNIQUE NONCLUSTERED ([provider],[providerAccountId])
);

-- CreateTable
CREATE TABLE [dbo].[VerificationToken] (
    [identifier] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    CONSTRAINT [VerificationToken_token_key] UNIQUE NONCLUSTERED ([token]),
    CONSTRAINT [VerificationToken_identifier_token_key] UNIQUE NONCLUSTERED ([identifier],[token])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [emailVerified] DATETIME2,
    [image] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'UNSET',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [User_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[TopicArea] (
    [id] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [TopicArea_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TopicArea_slug_key] UNIQUE NONCLUSTERED ([slug]),
    CONSTRAINT [TopicArea_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[ProposalAttachment] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [href] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [proposalId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProposalAttachment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [ProposalAttachment_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ProposalAttachment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ApplicationAttachment] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [href] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [proposalApplicationId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ApplicationAttachment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [ApplicationAttachment_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ApplicationAttachment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Proposal] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [language] NVARCHAR(1000) NOT NULL,
    [studyLevel] NVARCHAR(1000) NOT NULL,
    [topicAreaSlug] NVARCHAR(1000) NOT NULL,
    [typeKey] NVARCHAR(1000) NOT NULL,
    [statusKey] NVARCHAR(1000) NOT NULL CONSTRAINT [Proposal_statusKey_df] DEFAULT 'OPEN',
    [ownedByUserEmail] NVARCHAR(1000),
    [ownedByStudent] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Proposal_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Proposal_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Proposal_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Proposal_id_key] UNIQUE NONCLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProposalApplication] (
    [id] NVARCHAR(1000) NOT NULL,
    [statusKey] NVARCHAR(1000) NOT NULL CONSTRAINT [ProposalApplication_statusKey_df] DEFAULT 'OPEN',
    [email] NVARCHAR(1000) NOT NULL,
    [matriculationNumber] NVARCHAR(1000) NOT NULL,
    [fullName] NVARCHAR(1000) NOT NULL,
    [plannedStartAt] DATETIME2 NOT NULL,
    [motivation] NVARCHAR(1000) NOT NULL,
    [proposalId] NVARCHAR(1000) NOT NULL,
    [supervisionId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProposalApplication_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [ProposalApplication_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ProposalApplication_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProposalApplication_proposalId_email_key] UNIQUE NONCLUSTERED ([proposalId],[email])
);

-- CreateTable
CREATE TABLE [dbo].[UserProposalSupervision] (
    [id] NVARCHAR(1000) NOT NULL,
    [proposalId] NVARCHAR(1000) NOT NULL,
    [supervisorEmail] NVARCHAR(1000),
    [studentEmail] NVARCHAR(1000),
    [studyLevel] NVARCHAR(1000),
    CONSTRAINT [UserProposalSupervision_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserProposalSupervision_proposalId_key] UNIQUE NONCLUSTERED ([proposalId])
);

-- CreateTable
CREATE TABLE [dbo].[UserProposalFeedback] (
    [id] NVARCHAR(1000) NOT NULL,
    [proposalId] NVARCHAR(1000) NOT NULL,
    [userEmail] NVARCHAR(1000) NOT NULL,
    [typeKey] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [comment] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [UserProposalFeedback_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserProposalFeedback_proposalId_userEmail_key] UNIQUE NONCLUSTERED ([proposalId],[userEmail])
);

-- AddForeignKey
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProposalAttachment] ADD CONSTRAINT [ProposalAttachment_proposalId_fkey] FOREIGN KEY ([proposalId]) REFERENCES [dbo].[Proposal]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ApplicationAttachment] ADD CONSTRAINT [ApplicationAttachment_proposalApplicationId_fkey] FOREIGN KEY ([proposalApplicationId]) REFERENCES [dbo].[ProposalApplication]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Proposal] ADD CONSTRAINT [Proposal_topicAreaSlug_fkey] FOREIGN KEY ([topicAreaSlug]) REFERENCES [dbo].[TopicArea]([slug]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Proposal] ADD CONSTRAINT [Proposal_typeKey_fkey] FOREIGN KEY ([typeKey]) REFERENCES [dbo].[ProposalType]([key]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Proposal] ADD CONSTRAINT [Proposal_statusKey_fkey] FOREIGN KEY ([statusKey]) REFERENCES [dbo].[ProposalStatus]([key]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Proposal] ADD CONSTRAINT [Proposal_ownedByUserEmail_fkey] FOREIGN KEY ([ownedByUserEmail]) REFERENCES [dbo].[User]([email]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProposalApplication] ADD CONSTRAINT [ProposalApplication_statusKey_fkey] FOREIGN KEY ([statusKey]) REFERENCES [dbo].[ApplicationStatus]([key]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProposalApplication] ADD CONSTRAINT [ProposalApplication_proposalId_fkey] FOREIGN KEY ([proposalId]) REFERENCES [dbo].[Proposal]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProposalApplication] ADD CONSTRAINT [ProposalApplication_supervisionId_fkey] FOREIGN KEY ([supervisionId]) REFERENCES [dbo].[UserProposalSupervision]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserProposalSupervision] ADD CONSTRAINT [UserProposalSupervision_proposalId_fkey] FOREIGN KEY ([proposalId]) REFERENCES [dbo].[Proposal]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserProposalSupervision] ADD CONSTRAINT [UserProposalSupervision_supervisorEmail_fkey] FOREIGN KEY ([supervisorEmail]) REFERENCES [dbo].[User]([email]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserProposalFeedback] ADD CONSTRAINT [UserProposalFeedback_proposalId_fkey] FOREIGN KEY ([proposalId]) REFERENCES [dbo].[Proposal]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserProposalFeedback] ADD CONSTRAINT [UserProposalFeedback_userEmail_fkey] FOREIGN KEY ([userEmail]) REFERENCES [dbo].[User]([email]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserProposalFeedback] ADD CONSTRAINT [UserProposalFeedback_typeKey_fkey] FOREIGN KEY ([typeKey]) REFERENCES [dbo].[ProposalFeedbackType]([key]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
