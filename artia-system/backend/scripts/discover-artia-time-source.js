import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: new URL('../.env', import.meta.url) });

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pickColumn(columns, patterns) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return null;
  }

  const normalizedColumns = columns.map((column) => ({
    original: column,
    normalized: normalizeText(column).replace(/ /g, '_')
  }));

  for (const pattern of patterns) {
    const normalizedPattern = normalizeText(pattern).replace(/ /g, '_');
    const exactMatch = normalizedColumns.find((column) => column.normalized === normalizedPattern);
    if (exactMatch) {
      return exactMatch.original;
    }
  }

  for (const pattern of patterns) {
    const normalizedPattern = normalizeText(pattern).replace(/ /g, '_');
    const partialMatch = normalizedColumns.find((column) => column.normalized.includes(normalizedPattern));
    if (partialMatch) {
      return partialMatch.original;
    }
  }

  return null;
}

function buildSourceFromColumns(tableName, columns) {
  return {
    tableName,
    entryIdColumn: pickColumn(columns, ['time_entry_id', 'entry_id', 'worklog_id', 'id']),
    userIdColumn: pickColumn(columns, ['user_id', 'responsible_user_id', 'owner_id', 'employee_id', 'collaborator_id', 'person_id', 'resource_id', 'created_by']),
    userEmailColumn: pickColumn(columns, ['user_email', 'employee_email', 'collaborator_email', 'email']),
    dateColumn: pickColumn(columns, ['worked_date', 'work_date', 'launch_date', 'entry_date', 'reference_date', 'date', 'day']),
    startColumn: pickColumn(columns, ['start_time', 'started_at', 'start_at', 'begin_time', 'begin_at', 'initial_time']),
    endColumn: pickColumn(columns, ['end_time', 'ended_at', 'finish_time', 'finish_at', 'final_time']),
    hoursColumn: pickColumn(columns, ['worked_hours', 'total_hours', 'hours', 'effort_hours']),
    minutesColumn: pickColumn(columns, ['worked_minutes', 'total_minutes', 'minutes', 'duration_minutes', 'effort_minutes']),
    durationColumn: pickColumn(columns, ['duration', 'time_spent', 'effort', 'elapsed']),
    projectColumn: pickColumn(columns, ['project_number', 'project_name', 'project_title', 'project']),
    projectIdColumn: pickColumn(columns, ['project_id', 'parent_id']),
    activityColumn: pickColumn(columns, ['activity_name', 'activity_label', 'activity_title', 'activity', 'task_name', 'title']),
    activityIdColumn: pickColumn(columns, ['activity_id', 'task_id']),
    notesColumn: pickColumn(columns, ['notes', 'note', 'description', 'comment', 'comments', 'observacao', 'observation']),
    statusColumn: pickColumn(columns, ['status', 'state'])
  };
}

function scoreSource(source) {
  let score = 0;
  const tableName = normalizeText(source.tableName);
  const tableKeywords = ['timesheet', 'timeentry', 'time_entry', 'timeentries', 'hour', 'hours', 'worklog', 'launch', 'lancamento', 'apont', 'effort'];

  if (source.userIdColumn || source.userEmailColumn) {
    score += 3;
  }

  if (source.dateColumn || source.startColumn) {
    score += 3;
  }

  if (source.hoursColumn || source.minutesColumn || source.durationColumn || (source.startColumn && source.endColumn)) {
    score += 4;
  }

  if (source.projectColumn || source.projectIdColumn) {
    score += 1;
  }

  if (source.activityColumn || source.activityIdColumn) {
    score += 1;
  }

  if (tableKeywords.some((keyword) => tableName.includes(keyword))) {
    score += 3;
  }

  if (tableName.includes('activities')) {
    score -= 4;
  }

  if (/^organization_\d+_/.test(source.tableName)) {
    score += 1;
  }

  return score;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.ARTIA_DB_HOST,
    port: Number(process.env.ARTIA_DB_PORT || 3306),
    user: process.env.ARTIA_DB_USER,
    password: process.env.ARTIA_DB_PASSWORD,
    database: process.env.ARTIA_DB_NAME
  });

  const [rows] = await connection.query(`
    SELECT table_name AS tableName, column_name AS columnName
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    ORDER BY table_name, ordinal_position
  `);

  const columnsByTable = rows.reduce((accumulator, row) => {
    if (!accumulator[row.tableName]) {
      accumulator[row.tableName] = [];
    }

    accumulator[row.tableName].push(row.columnName);
    return accumulator;
  }, {});

  const ranked = Object.entries(columnsByTable)
    .map(([tableName, columns]) => {
      const source = buildSourceFromColumns(tableName, columns);
      return {
        tableName,
        columns,
        source,
        score: scoreSource(source)
      };
    })
    .filter((candidate) => candidate.score >= 8)
    .sort((left, right) => right.score - left.score)
    .slice(0, 20);

  console.log(JSON.stringify(ranked, null, 2));
  await connection.end();
}

main().catch((error) => {
  console.error('[discover-artia-time-source] erro:', error);
  process.exit(1);
});
