/*
  Warnings:

  - You are about to drop the column `student` on the `admininfo` table. All the data in the column will be lost.
  - You are about to drop the column `supervisor` on the `admininfo` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `admininfo` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `admininfo` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `admininfo` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.
  - A unique constraint covering the columns `[proposalId]` on the table `AdminInfo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `proposalId` to the `AdminInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `admininfo` DROP COLUMN `student`,
    DROP COLUMN `supervisor`,
    DROP COLUMN `title`,
    DROP COLUMN `type`,
    ADD COLUMN `proposalId` VARCHAR(191) NOT NULL,
    MODIFY `status` ENUM('OPEN', 'SUBMITTED', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED') NULL;

-- AlterTable
ALTER TABLE `userproposalsupervision` ADD COLUMN `responsibleId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Responsible` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Responsible_id_key`(`id`),
    UNIQUE INDEX `Responsible_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `AdminInfo_proposalId_key` ON `AdminInfo`(`proposalId`);

-- AddForeignKey
ALTER TABLE `UserProposalSupervision` ADD CONSTRAINT `UserProposalSupervision_responsibleId_fkey` FOREIGN KEY (`responsibleId`) REFERENCES `Responsible`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `AdminInfo` ADD CONSTRAINT `AdminInfo_proposalId_fkey` FOREIGN KEY (`proposalId`) REFERENCES `Proposal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
