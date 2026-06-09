/*
  Warnings:

  - The values [UNDER_REVIEW] on the enum `AdminInfo_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `admininfo` MODIFY `status` ENUM('OPEN', 'SUBMITTED', 'IN_PROGRESS', 'GRADING', 'WITHDRAWN', 'COMPLETED') NULL;

-- AlterTable
ALTER TABLE `proposalapplication` ADD COLUMN `allowPublication` BOOLEAN NULL,
    ADD COLUMN `allowUsage` BOOLEAN NULL;
