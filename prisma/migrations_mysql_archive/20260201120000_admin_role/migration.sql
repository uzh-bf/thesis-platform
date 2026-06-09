-- AlterTable
ALTER TABLE `user` ADD COLUMN `AdminRole` ENUM('COORDINATOR', 'ADMIN', 'UNSET') NOT NULL DEFAULT 'UNSET';

-- Migrate existing data from boolean isAdmin
UPDATE `user`
SET `AdminRole` = CASE WHEN `isAdmin` = 1 THEN 'COORDINATOR' ELSE 'UNSET' END;

-- Drop old column
ALTER TABLE `user` DROP COLUMN `isAdmin`;

