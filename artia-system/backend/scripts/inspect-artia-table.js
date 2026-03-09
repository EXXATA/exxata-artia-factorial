import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: new URL('../.env', import.meta.url) });

async function main() {
  const tableName = process.argv[2];
  const limit = Number(process.argv[3] || 3);

  if (!tableName) {
    throw new Error('Informe o nome da tabela.');
  }

  const connection = await mysql.createConnection({
    host: process.env.ARTIA_DB_HOST,
    port: Number(process.env.ARTIA_DB_PORT || 3306),
    user: process.env.ARTIA_DB_USER,
    password: process.env.ARTIA_DB_PASSWORD,
    database: process.env.ARTIA_DB_NAME
  });

  const [columns] = await connection.query(
    `SELECT column_name AS columnName, data_type AS dataType
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ?
     ORDER BY ordinal_position`,
    [tableName]
  );

  const [sampleRows] = await connection.query(
    `SELECT * FROM \`${tableName.replace(/`/g, '``')}\` LIMIT ${Number.isFinite(limit) ? limit : 3}`
  );

  console.log(JSON.stringify({
    tableName,
    columns,
    sampleRows
  }, null, 2));

  await connection.end();
}

main().catch((error) => {
  console.error('[inspect-artia-table] erro:', error);
  process.exit(1);
});
