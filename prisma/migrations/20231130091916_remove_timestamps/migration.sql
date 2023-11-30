/*
  Warnings:

  - You are about to drop the column `createdAt` on the `userproposalfeedback` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `userproposalfeedback` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `userproposalsupervision` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `userproposalsupervision` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `userproposalfeedback` DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`;

-- AlterTable
ALTER TABLE `userproposalsupervision` DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`;
