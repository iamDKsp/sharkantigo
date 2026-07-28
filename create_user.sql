-- Script para criar um usuário de administrador
INSERT INTO perfis (id, nome, email, senha, criado_em)
VALUES (
  gen_random_uuid(),
  'Administrador',
  'admin@sharkantigo.com',
  'admin123456',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Verificar se foi criado
SELECT id, nome, email FROM perfis WHERE email = 'admin@sharkantigo.com';

