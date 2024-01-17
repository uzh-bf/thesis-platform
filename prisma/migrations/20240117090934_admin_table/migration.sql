-- CreateTable
CREATE TABLE `AdminInfo` (
    `id` VARCHAR(191) NOT NULL,
    `mailReceived` VARCHAR(191) NULL,
    `supervisor` VARCHAR(191) NULL,
    `student` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `type` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `olatCapturedDate` DATETIME(3) NULL,
    `submissionDate` DATETIME(3) NULL,
    `grade` DOUBLE NULL,
    `olatGradeDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdminInfo_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
