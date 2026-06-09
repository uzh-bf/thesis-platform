-- AlterTable
ALTER TABLE `admininfo` ADD COLUMN `department` ENUM('DF', 'IBW') NULL;

-- AlterTable
ALTER TABLE `proposal` ADD COLUMN `department` ENUM('DF', 'IBW') NULL;

-- AlterTable
ALTER TABLE `responsible` ADD COLUMN `department` ENUM('DF', 'IBW') NULL;

-- AlterTable
ALTER TABLE `topicarea` ADD COLUMN `department` ENUM('DF', 'IBW') NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `department` ENUM('DF', 'IBW') NULL;
