-- AddData: Insert admin user
INSERT INTO "perfis" (id, nome, email, senha, criado_em)
VALUES (
  gen_random_uuid(),
  'Administrador',
  'admin@sharkantigo.com',
  'admin123456',
  NOW()
)
ON CONFLICT ("email") DO NOTHING;

