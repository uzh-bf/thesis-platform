-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Department" AS ENUM ('DF', 'IBW');

-- CreateEnum
CREATE TYPE "public"."AdminRole" AS ENUM ('COORDINATOR', 'ADMIN', 'UNSET');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('OPEN', 'SUBMITTED', 'IN_PROGRESS', 'GRADING', 'WITHDRAWN', 'COMPLETED', 'ARCHIVED', 'OVERDUE');

-- CreateTable
CREATE TABLE "public"."ProposalStatus" (
    "key" TEXT NOT NULL,

    CONSTRAINT "ProposalStatus_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."ApplicationStatus" (
    "key" TEXT NOT NULL,

    CONSTRAINT "ApplicationStatus_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."ProposalType" (
    "key" TEXT NOT NULL,

    CONSTRAINT "ProposalType_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."ProposalFeedbackType" (
    "key" TEXT NOT NULL,

    CONSTRAINT "ProposalFeedbackType_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "refresh_token_expires_in" INTEGER,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "ext_expires_in" INTEGER,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'UNSET',
    "AdminRole" "public"."AdminRole" NOT NULL DEFAULT 'UNSET',
    "department" "public"."Department",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TopicArea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" "public"."Department",

    CONSTRAINT "TopicArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProposalAttachment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApplicationAttachment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "proposalApplicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Proposal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "studyLevel" TEXT NOT NULL,
    "timeFrame" TEXT,
    "additionalStudentComment" TEXT,
    "topicAreaSlug" TEXT NOT NULL,
    "department" "public"."Department",
    "typeKey" TEXT NOT NULL,
    "statusKey" TEXT NOT NULL DEFAULT 'OPEN',
    "ownedByUserEmail" TEXT,
    "ownedByStudent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProposalApplication" (
    "id" TEXT NOT NULL,
    "statusKey" TEXT NOT NULL DEFAULT 'OPEN',
    "email" TEXT NOT NULL,
    "matriculationNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "plannedStartAt" TIMESTAMP(3) NOT NULL,
    "motivation" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "supervisionId" TEXT,
    "allowPublication" BOOLEAN,
    "allowUsage" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProposalSupervision" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "responsibleId" TEXT,
    "supervisorEmail" TEXT,
    "studentEmail" TEXT,
    "studyLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProposalSupervision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProposalFeedback" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "typeKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProposalFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminInfo" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "mailReceived" TEXT,
    "status" "public"."Status",
    "olatCapturedDate" TIMESTAMP(3),
    "latestSubmissionDate" TIMESTAMP(3),
    "submissionDate" TIMESTAMP(3),
    "grade" DOUBLE PRECISION,
    "olatGradeDate" TIMESTAMP(3),
    "comment" TEXT,
    "capturedOnZora" BOOLEAN,
    "department" "public"."Department",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Responsible" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" "public"."Department",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Responsible_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProposalStatus_key_key" ON "public"."ProposalStatus"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationStatus_key_key" ON "public"."ApplicationStatus"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalType_key_key" ON "public"."ProposalType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalFeedbackType_key_key" ON "public"."ProposalFeedbackType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Account_id_key" ON "public"."Account"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "public"."User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TopicArea_id_key" ON "public"."TopicArea"("id");

-- CreateIndex
CREATE UNIQUE INDEX "TopicArea_slug_key" ON "public"."TopicArea"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TopicArea_name_key" ON "public"."TopicArea"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalAttachment_id_key" ON "public"."ProposalAttachment"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationAttachment_id_key" ON "public"."ApplicationAttachment"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_id_key" ON "public"."Proposal"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalApplication_id_key" ON "public"."ProposalApplication"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalApplication_proposalId_email_key" ON "public"."ProposalApplication"("proposalId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProposalSupervision_id_key" ON "public"."UserProposalSupervision"("id");

-- CreateIndex
CREATE UNIQUE INDEX "UserProposalSupervision_proposalId_key" ON "public"."UserProposalSupervision"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProposalFeedback_id_key" ON "public"."UserProposalFeedback"("id");

-- CreateIndex
CREATE UNIQUE INDEX "UserProposalFeedback_proposalId_userEmail_key" ON "public"."UserProposalFeedback"("proposalId", "userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInfo_id_key" ON "public"."AdminInfo"("id");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInfo_proposalId_key" ON "public"."AdminInfo"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Responsible_id_key" ON "public"."Responsible"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Responsible_email_key" ON "public"."Responsible"("email");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalAttachment" ADD CONSTRAINT "ProposalAttachment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApplicationAttachment" ADD CONSTRAINT "ApplicationAttachment_proposalApplicationId_fkey" FOREIGN KEY ("proposalApplicationId") REFERENCES "public"."ProposalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_topicAreaSlug_fkey" FOREIGN KEY ("topicAreaSlug") REFERENCES "public"."TopicArea"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_typeKey_fkey" FOREIGN KEY ("typeKey") REFERENCES "public"."ProposalType"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_statusKey_fkey" FOREIGN KEY ("statusKey") REFERENCES "public"."ProposalStatus"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_ownedByUserEmail_fkey" FOREIGN KEY ("ownedByUserEmail") REFERENCES "public"."User"("email") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalApplication" ADD CONSTRAINT "ProposalApplication_statusKey_fkey" FOREIGN KEY ("statusKey") REFERENCES "public"."ApplicationStatus"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalApplication" ADD CONSTRAINT "ProposalApplication_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalApplication" ADD CONSTRAINT "ProposalApplication_supervisionId_fkey" FOREIGN KEY ("supervisionId") REFERENCES "public"."UserProposalSupervision"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."UserProposalSupervision" ADD CONSTRAINT "UserProposalSupervision_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProposalSupervision" ADD CONSTRAINT "UserProposalSupervision_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "public"."Responsible"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."UserProposalSupervision" ADD CONSTRAINT "UserProposalSupervision_supervisorEmail_fkey" FOREIGN KEY ("supervisorEmail") REFERENCES "public"."User"("email") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."UserProposalFeedback" ADD CONSTRAINT "UserProposalFeedback_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProposalFeedback" ADD CONSTRAINT "UserProposalFeedback_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "public"."User"("email") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."UserProposalFeedback" ADD CONSTRAINT "UserProposalFeedback_typeKey_fkey" FOREIGN KEY ("typeKey") REFERENCES "public"."ProposalFeedbackType"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminInfo" ADD CONSTRAINT "AdminInfo_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
