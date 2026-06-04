-- AlterTable
ALTER TABLE `emprestimos` ADD COLUMN `categoria` VARCHAR(191) NOT NULL DEFAULT 'Sem categoria',
    ADD COLUMN `data_inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `frequencia` VARCHAR(191) NOT NULL DEFAULT 'mensal',
    ADD COLUMN `juros_atraso` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `observacoes` TEXT NULL,
    ADD COLUMN `tipo_pagamento` VARCHAR(191) NOT NULL DEFAULT 'a_vista';

-- CreateTable
CREATE TABLE `parcelas` (
    `id` VARCHAR(191) NOT NULL,
    `emprestimo_id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `data_vencimento` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'aberto',
    `data_pagamento` DATE NULL,
    `valor_pago` DECIMAL(15, 2) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `parcelas` ADD CONSTRAINT `parcelas_emprestimo_id_fkey` FOREIGN KEY (`emprestimo_id`) REFERENCES `emprestimos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
