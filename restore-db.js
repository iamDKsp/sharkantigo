const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function restore() {
  const dbUrl = process.argv[2] || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("\n❌ ERRO: Nenhuma DATABASE_URL foi informada!");
    process.exit(1);
  }

  const dumpPath = path.resolve('C:\\Users\\DKS\\Downloads\\Nova pasta (4)\\dump-postgres-202607262014.sql');

  if (!fs.existsSync(dumpPath)) {
    console.error(`\n❌ ERRO: Arquivo de dump não encontrado em: ${dumpPath}\n`);
    process.exit(1);
  }

  console.log("🔌 Conectando ao Banco de Dados do Railway...");

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Conexão estabelecida com sucesso!");

    console.log(`📂 Lendo o arquivo de dump SQL (${(fs.statSync(dumpPath).size / 1024 / 1024).toFixed(2)} MB)...`);
    let fileContent = fs.readFileSync(dumpPath, 'utf8');

    console.log("🧹 Filtrando comandos DDL de permissões/proprietários do Supabase...");
    const cleanLines = fileContent.split('\n').filter(line => {
      const trimmed = line.trim();
      if (trimmed === 'CREATE SCHEMA public;') return false;
      if (trimmed.startsWith('ALTER SCHEMA public OWNER TO')) return false;
      if (trimmed.startsWith('GRANT ') && (trimmed.includes(' TO anon') || trimmed.includes(' TO authenticated') || trimmed.includes(' TO service_role') || trimmed.includes(' TO postgres') || trimmed.includes(' TO supabase_admin'))) return false;
      if (trimmed.startsWith('REVOKE ')) return false;
      if (trimmed.startsWith('ALTER DEFAULT PRIVILEGES')) return false;
      if ((trimmed.startsWith('ALTER TABLE') || trimmed.startsWith('ALTER SEQUENCE') || trimmed.startsWith('ALTER FUNCTION')) && trimmed.includes('OWNER TO')) return false;
      return true;
    });

    let sql = cleanLines.join('\n');

    console.log("⚡ Executando a restauração dos dados no Railway (isso pode levar de 15 a 30 segundos)...");
    await client.query(sql);

    console.log("\n🎉 TODOS OS DADOS FORAM RESTAURADOS COM SUCESSO NO RAILWAY!\n");
  } catch (err) {
    console.error("\n❌ Erro durante a restauração do banco:", err.message || err);
  } finally {
    await client.end();
  }
}

restore();
