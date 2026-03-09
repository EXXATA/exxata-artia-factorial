require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.ARTIA_DB_HOST,
    port: Number(process.env.ARTIA_DB_PORT || 3306),
    user: process.env.ARTIA_DB_USER,
    password: process.env.ARTIA_DB_PASSWORD,
    database: process.env.ARTIA_DB_NAME,
  });

  const queries = [
    ['total_projects_table', `SELECT COUNT(*) AS total FROM organization_9115_projects_v2`],
    ['by_object_type', `SELECT object_type, COUNT(*) AS total FROM organization_9115_projects_v2 GROUP BY object_type ORDER BY total DESC`],
    ['by_status', `SELECT status, COUNT(*) AS total FROM organization_9115_projects_v2 GROUP BY status ORDER BY total DESC`],
    ['projects_only_by_status', `SELECT status, COUNT(*) AS total FROM organization_9115_projects_v2 WHERE object_type = 'project' GROUP BY status ORDER BY total DESC`],
    ['projects_only_total', `SELECT COUNT(*) AS total FROM organization_9115_projects_v2 WHERE object_type = 'project'`],
    ['current_sync_scope', `SELECT COUNT(*) AS total FROM organization_9115_projects_v2 WHERE object_type = 'project' AND status = 1`],
    ['sample_non_status_1', `SELECT id, project_number, name, status, object_type FROM organization_9115_projects_v2 WHERE object_type = 'project' AND status <> 1 ORDER BY id DESC LIMIT 20`]
  ];

  for (const [label, sql] of queries) {
    const [rows] = await conn.query(sql);
    console.log(`\n=== ${label} ===`);
    console.log(JSON.stringify(rows, null, 2));
  }

  await conn.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
