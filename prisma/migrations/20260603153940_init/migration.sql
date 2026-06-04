-- CreateTable
CREATE TABLE `perfis` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `perfis_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NOT NULL,
    `cidade` VARCHAR(191) NOT NULL,
    `documento` VARCHAR(191) NOT NULL,
    `foto_url` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emprestimos` (
    `id` VARCHAR(191) NOT NULL,
    `valor_emprestado` DECIMAL(15, 2) NOT NULL,
    `taxa_juros` DECIMAL(5, 2) NOT NULL,
    `taxa_multa` DECIMAL(5, 2) NOT NULL,
    `data_vencimento` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativo',
    `cliente_id` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cheques` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NULL,
    `titular` VARCHAR(191) NOT NULL,
    `banco` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `data_compensacao` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'em_maos',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `emprestimos` ADD CONSTRAINT `emprestimos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
