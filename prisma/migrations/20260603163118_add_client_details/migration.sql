-- AlterTable
ALTER TABLE `clientes` ADD COLUMN `blacklist` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `endereco` TEXT NULL,
    ADD COLUMN `referencia` TEXT NULL;
