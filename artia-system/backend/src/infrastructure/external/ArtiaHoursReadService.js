import { artiaDB } from '../database/mysql/ArtiaDBConnection.js';

const USER_TABLE = 'organization_9115_organization_users_v2';
const SOURCE_CACHE_TTL_MS = 5 * 60 * 1000;
const TABLE_KEYWORDS = ['timesheet', 'timeentry', 'time_entry', 'timeentries', 'hour', 'hours', 'worklog', 'launch', 'lancamento', 'apont', 'effort'];

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toDateOnly(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  const stringValue = String(value).trim();
  if (!stringValue) return null;

  const isoMatch = stringValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const brMatch = stringValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  const parsed = new Date(stringValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().split('T')[0];
}

function parseDurationToMinutes(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 24) {
      return Math.round(value * 60);
    }

    return Math.round(value);
  }

  const stringValue = String(value).trim();
  if (!stringValue) return 0;

  const hhmmMatch = stringValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hhmmMatch) {
    return (parseInt(hhmmMatch[1], 10) * 60) + parseInt(hhmmMatch[2], 10);
  }

  const decimal = Number(stringValue.replace(',', '.'));
  if (Number.isFinite(decimal)) {
    if (decimal <= 24) {
      return Math.round(decimal * 60);
    }

    return Math.round(decimal);
  }

  return 0;
}

function diffMinutes(start, end) {
  if (!start || !end) return 0;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

export class ArtiaHoursReadService {
  constructor() {
    this.cachedSource = null;
    this.cachedSourceAt = 0;
  }

  escapeIdentifier(identifier) {
    return `\`${String(identifier).replace(/`/g, '``')}\``;
  }

  pickColumn(columns, patterns) {
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

  buildSourceFromColumns(tableName, columns) {
    return {
      tableName,
      entryIdColumn: this.pickColumn(columns, ['time_entry_id', 'entry_id', 'worklog_id', 'id']),
      userIdColumn: this.pickColumn(columns, ['user_id', 'responsible_user_id', 'owner_id', 'employee_id', 'collaborator_id', 'person_id', 'resource_id', 'created_by']),
      userEmailColumn: this.pickColumn(columns, ['user_email', 'employee_email', 'collaborator_email', 'email']),
      dateColumn: this.pickColumn(columns, ['worked_date', 'work_date', 'launch_date', 'entry_date', 'reference_date', 'date', 'day']),
      startColumn: this.pickColumn(columns, ['start_time', 'started_at', 'start_at', 'begin_time', 'begin_at', 'initial_time']),
      endColumn: this.pickColumn(columns, ['end_time', 'ended_at', 'finish_time', 'finish_at', 'final_time']),
      hoursColumn: this.pickColumn(columns, ['worked_hours', 'total_hours', 'hours', 'effort_hours']),
      minutesColumn: this.pickColumn(columns, ['worked_minutes', 'total_minutes', 'minutes', 'duration_minutes', 'effort_minutes']),
      durationColumn: this.pickColumn(columns, ['duration', 'time_spent', 'effort', 'elapsed']),
      projectColumn: this.pickColumn(columns, ['project_number', 'project_name', 'project_title', 'project']),
      projectIdColumn: this.pickColumn(columns, ['project_id', 'parent_id']),
      activityColumn: this.pickColumn(columns, ['activity_name', 'activity_label', 'activity_title', 'activity', 'task_name', 'title']),
      activityIdColumn: this.pickColumn(columns, ['activity_id', 'task_id']),
      notesColumn: this.pickColumn(columns, ['notes', 'note', 'description', 'comment', 'comments', 'observacao', 'observation']),
      statusColumn: this.pickColumn(columns, ['status', 'state'])
    };
  }

  scoreSource(source) {
    let score = 0;
    const tableName = normalizeText(source.tableName);

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

    if (TABLE_KEYWORDS.some((keyword) => tableName.includes(keyword))) {
      score += 2;
    }

    if (/^organization_\d+_/.test(source.tableName)) {
      score += 1;
    }

    return score;
  }

  getConfiguredSource() {
    const tableName = process.env.ARTIA_DB_TIME_ENTRIES_TABLE;
    if (!tableName) {
      return null;
    }

    return {
      tableName,
      entryIdColumn: process.env.ARTIA_DB_TIME_ENTRY_ID_COLUMN || 'id',
      userIdColumn: process.env.ARTIA_DB_TIME_ENTRY_USER_ID_COLUMN || null,
      userEmailColumn: process.env.ARTIA_DB_TIME_ENTRY_USER_EMAIL_COLUMN || null,
      dateColumn: process.env.ARTIA_DB_TIME_ENTRY_DATE_COLUMN || null,
      startColumn: process.env.ARTIA_DB_TIME_ENTRY_START_COLUMN || null,
      endColumn: process.env.ARTIA_DB_TIME_ENTRY_END_COLUMN || null,
      hoursColumn: process.env.ARTIA_DB_TIME_ENTRY_HOURS_COLUMN || null,
      minutesColumn: process.env.ARTIA_DB_TIME_ENTRY_MINUTES_COLUMN || null,
      durationColumn: process.env.ARTIA_DB_TIME_ENTRY_DURATION_COLUMN || null,
      projectColumn: process.env.ARTIA_DB_TIME_ENTRY_PROJECT_COLUMN || null,
      projectIdColumn: process.env.ARTIA_DB_TIME_ENTRY_PROJECT_ID_COLUMN || null,
      activityColumn: process.env.ARTIA_DB_TIME_ENTRY_ACTIVITY_COLUMN || null,
      activityIdColumn: process.env.ARTIA_DB_TIME_ENTRY_ACTIVITY_ID_COLUMN || null,
      notesColumn: process.env.ARTIA_DB_TIME_ENTRY_NOTES_COLUMN || null,
      statusColumn: process.env.ARTIA_DB_TIME_ENTRY_STATUS_COLUMN || null
    };
  }

  async discoverTimeEntriesSource() {
    const now = Date.now();
    if (this.cachedSource && (now - this.cachedSourceAt) < SOURCE_CACHE_TTL_MS) {
      return this.cachedSource;
    }

    const configured = this.getConfiguredSource();
    if (configured) {
      this.cachedSource = configured;
      this.cachedSourceAt = now;
      return configured;
    }

    const rows = await artiaDB.query(`
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

    const candidates = Object.entries(columnsByTable)
      .map(([tableName, columns]) => {
        const source = this.buildSourceFromColumns(tableName, columns);
        return {
          source,
          score: this.scoreSource(source)
        };
      })
      .filter((candidate) => candidate.score >= 8)
      .sort((left, right) => right.score - left.score);

    this.cachedSource = candidates[0]?.source || null;
    this.cachedSourceAt = now;

    return this.cachedSource;
  }

  async getUserByEmail(email) {
    if (!email) {
      return null;
    }

    const users = await artiaDB.query(
      `SELECT id, user_email AS email, user_name AS name
       FROM ${USER_TABLE}
       WHERE user_email = ? AND status = 1
       LIMIT 1`,
      [email]
    );

    if (!users.length) {
      return null;
    }

    return {
      id: String(users[0].id),
      email: users[0].email,
      name: users[0].name
    };
  }

  async resolveArtiaIdentity({ email, artiaUserId }) {
    if (artiaUserId) {
      return {
        artiaUserId: String(artiaUserId),
        email: email || null
      };
    }

    const artiaUser = await this.getUserByEmail(email);
    if (!artiaUser) {
      return {
        artiaUserId: null,
        email: email || null
      };
    }

    return {
      artiaUserId: artiaUser.id,
      email: artiaUser.email
    };
  }

  buildDateTime(day, value) {
    if (!value) {
      return null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }

    const stringValue = String(value).trim();
    if (!stringValue) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(stringValue) || /^\d{4}-\d{2}-\d{2} /.test(stringValue)) {
      const parsedDate = new Date(stringValue.replace(' ', 'T'));
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
    }

    const timeOnlyMatch = stringValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (timeOnlyMatch && day) {
      const date = new Date(`${day}T00:00:00`);
      date.setHours(parseInt(timeOnlyMatch[1], 10), parseInt(timeOnlyMatch[2], 10), 0, 0);
      return date.toISOString();
    }

    const parsed = new Date(stringValue);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
  }

  normalizeTimeEntry(row, source) {
    const date = toDateOnly(row.dateValue || row.startValue);
    const start = this.buildDateTime(date, row.startValue);
    const end = this.buildDateTime(date, row.endValue);

    let minutes = 0;

    if (row.minutesValue !== null && row.minutesValue !== undefined && row.minutesValue !== '') {
      minutes = parseDurationToMinutes(row.minutesValue);
    } else if (row.hoursValue !== null && row.hoursValue !== undefined && row.hoursValue !== '') {
      const parsedHours = Number(String(row.hoursValue).replace(',', '.'));
      minutes = Number.isFinite(parsedHours) ? Math.round(parsedHours * 60) : parseDurationToMinutes(row.hoursValue);
    } else if (row.durationValue !== null && row.durationValue !== undefined && row.durationValue !== '') {
      minutes = parseDurationToMinutes(row.durationValue);
    } else {
      minutes = diffMinutes(start, end);
    }

    return {
      id: String(row.entryId ?? `${date || 'no-date'}-${row.projectValue || row.projectIdValue || 'no-project'}-${row.activityValue || row.activityIdValue || 'no-activity'}-${minutes}`),
      date,
      start,
      end,
      minutes,
      hours: Number((minutes / 60).toFixed(2)),
      project: row.projectValue ? String(row.projectValue).trim() : '',
      projectId: row.projectIdValue ? String(row.projectIdValue).trim() : '',
      activity: row.activityValue ? String(row.activityValue).trim() : '',
      activityId: row.activityIdValue ? String(row.activityIdValue).trim() : '',
      notes: row.notesValue ? String(row.notesValue).trim() : '',
      userId: row.userIdValue ? String(row.userIdValue).trim() : '',
      userEmail: row.userEmailValue ? String(row.userEmailValue).trim() : '',
      status: row.statusValue ? String(row.statusValue).trim() : '',
      sourceTable: source?.tableName || null
    };
  }

  async getWorkedTimeEntriesForUser({ email, artiaUserId, startDate, endDate }) {
    const identity = await this.resolveArtiaIdentity({ email, artiaUserId });
    const source = await this.discoverTimeEntriesSource();

    if (!source) {
      return {
        entries: [],
        source: null,
        reason: 'time_entries_source_not_found'
      };
    }

    const userConditions = [];
    const params = [];

    if (source.userIdColumn && identity.artiaUserId) {
      userConditions.push(`${this.escapeIdentifier(source.userIdColumn)} = ?`);
      params.push(identity.artiaUserId);
    }

    if (source.userEmailColumn && identity.email) {
      userConditions.push(`${this.escapeIdentifier(source.userEmailColumn)} = ?`);
      params.push(identity.email);
    }

    if (userConditions.length === 0) {
      return {
        entries: [],
        source,
        reason: 'time_entries_user_filter_unavailable'
      };
    }

    const whereConditions = [userConditions.length === 1 ? userConditions[0] : `(${userConditions.join(' OR ')})`];
    const dateExpression = source.dateColumn
      ? `DATE(${this.escapeIdentifier(source.dateColumn)})`
      : source.startColumn
        ? `DATE(${this.escapeIdentifier(source.startColumn)})`
        : null;

    if (dateExpression && startDate) {
      whereConditions.push(`${dateExpression} >= ?`);
      params.push(startDate);
    }

    if (dateExpression && endDate) {
      whereConditions.push(`${dateExpression} <= ?`);
      params.push(endDate);
    }

    const selectParts = [
      source.entryIdColumn ? `${this.escapeIdentifier(source.entryIdColumn)} AS ${this.escapeIdentifier('entryId')}` : null,
      source.userIdColumn ? `${this.escapeIdentifier(source.userIdColumn)} AS ${this.escapeIdentifier('userIdValue')}` : null,
      source.userEmailColumn ? `${this.escapeIdentifier(source.userEmailColumn)} AS ${this.escapeIdentifier('userEmailValue')}` : null,
      source.dateColumn ? `${this.escapeIdentifier(source.dateColumn)} AS ${this.escapeIdentifier('dateValue')}` : null,
      source.startColumn ? `${this.escapeIdentifier(source.startColumn)} AS ${this.escapeIdentifier('startValue')}` : null,
      source.endColumn ? `${this.escapeIdentifier(source.endColumn)} AS ${this.escapeIdentifier('endValue')}` : null,
      source.hoursColumn ? `${this.escapeIdentifier(source.hoursColumn)} AS ${this.escapeIdentifier('hoursValue')}` : null,
      source.minutesColumn ? `${this.escapeIdentifier(source.minutesColumn)} AS ${this.escapeIdentifier('minutesValue')}` : null,
      source.durationColumn ? `${this.escapeIdentifier(source.durationColumn)} AS ${this.escapeIdentifier('durationValue')}` : null,
      source.projectColumn ? `${this.escapeIdentifier(source.projectColumn)} AS ${this.escapeIdentifier('projectValue')}` : null,
      source.projectIdColumn ? `${this.escapeIdentifier(source.projectIdColumn)} AS ${this.escapeIdentifier('projectIdValue')}` : null,
      source.activityColumn ? `${this.escapeIdentifier(source.activityColumn)} AS ${this.escapeIdentifier('activityValue')}` : null,
      source.activityIdColumn ? `${this.escapeIdentifier(source.activityIdColumn)} AS ${this.escapeIdentifier('activityIdValue')}` : null,
      source.notesColumn ? `${this.escapeIdentifier(source.notesColumn)} AS ${this.escapeIdentifier('notesValue')}` : null,
      source.statusColumn ? `${this.escapeIdentifier(source.statusColumn)} AS ${this.escapeIdentifier('statusValue')}` : null
    ].filter(Boolean);

    const sql = `
      SELECT ${selectParts.join(', ')}
      FROM ${this.escapeIdentifier(source.tableName)}
      WHERE ${whereConditions.join(' AND ')}
      ${dateExpression ? `ORDER BY ${dateExpression} ASC` : ''}
    `;

    const rows = await artiaDB.query(sql, params);
    const entries = rows
      .map((row) => this.normalizeTimeEntry(row, source))
      .filter((entry) => entry.date && entry.minutes > 0);

    return {
      entries,
      source,
      reason: null
    };
  }

  getVisibleRangeFromEvents(events) {
    if (!Array.isArray(events) || events.length === 0) {
      return {
        startDate: null,
        endDate: null
      };
    }

    const days = events.map((event) => event.day).filter(Boolean).sort();
    return {
      startDate: days[0] || null,
      endDate: days[days.length - 1] || null
    };
  }

  getStatusLabel(status) {
    if (status === 'synced') return 'Sincronizado';
    if (status === 'manual') return 'Marcado manualmente';
    return 'Pendente';
  }

  projectMatches(localProject, remoteProject) {
    const normalizedLocal = normalizeText(localProject);
    const normalizedRemote = normalizeText(remoteProject);

    if (!normalizedLocal || !normalizedRemote) {
      return false;
    }

    return normalizedLocal === normalizedRemote
      || normalizedLocal.startsWith(normalizedRemote)
      || normalizedRemote.startsWith(normalizedLocal)
      || normalizedLocal.includes(normalizedRemote)
      || normalizedRemote.includes(normalizedLocal);
  }

  activityMatches(localActivity, remoteActivity) {
    const normalizedLocal = normalizeText(localActivity);
    const normalizedRemote = normalizeText(remoteActivity);

    if (!normalizedLocal || !normalizedRemote) {
      return false;
    }

    return normalizedLocal === normalizedRemote
      || normalizedLocal.includes(normalizedRemote)
      || normalizedRemote.includes(normalizedLocal);
  }

  getEventMinutes(event) {
    return diffMinutes(event.start, event.end);
  }

  computeEntryScore(event, entry) {
    if (event.day !== entry.date) {
      return -1;
    }

    let score = 0;

    if (event.activityId && entry.activityId && String(event.activityId) === String(entry.activityId)) {
      score += 5;
    }

    if (this.activityMatches(event.activityLabel, entry.activity)) {
      score += 3;
    }

    if (this.projectMatches(event.project, entry.project || entry.projectId)) {
      score += 3;
    }

    const eventMinutes = this.getEventMinutes(event);
    const durationDiff = Math.abs(eventMinutes - entry.minutes);

    if (durationDiff <= 10) {
      score += 2;
    } else if (durationDiff <= 20) {
      score += 1;
    }

    if (event.start && entry.start) {
      const startDiff = Math.abs(diffMinutes(event.start, entry.start));
      if (startDiff <= 10) {
        score += 2;
      }
    }

    if (event.end && entry.end) {
      const endDiff = Math.abs(diffMinutes(event.end, entry.end));
      if (endDiff <= 10) {
        score += 2;
      }
    }

    if (event.artiaLaunched) {
      score += 1;
    }

    return score;
  }

  findBestMatchingEntry(event, entries, usedKeys) {
    let bestMatch = null;

    entries.forEach((entry, index) => {
      const usageKey = `${entry.id}:${index}`;
      if (usedKeys.has(usageKey)) {
        return;
      }

      const score = this.computeEntryScore(event, entry);
      if (score < 4) {
        return;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          entry,
          score,
          usageKey
        };
      }
    });

    if (bestMatch) {
      usedKeys.add(bestMatch.usageKey);
      return bestMatch.entry;
    }

    return null;
  }

  decorateEventsWithTimeEntries(events, entries, source = null, reason = null) {
    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }

    const usedKeys = new Set();

    return events.map((event) => {
      const matchedEntry = this.findBestMatchingEntry(event, entries, usedKeys);
      const artiaSyncStatus = matchedEntry ? 'synced' : (event.artiaLaunched ? 'manual' : 'pending');

      return {
        ...event,
        artiaSyncStatus,
        artiaSyncLabel: this.getStatusLabel(artiaSyncStatus),
        artiaSourceAvailable: Boolean(source),
        artiaSourceTable: source?.tableName || null,
        artiaSyncReason: matchedEntry ? null : reason,
        artiaRemoteEntryId: matchedEntry?.id || null,
        artiaRemoteProject: matchedEntry?.project || null,
        artiaRemoteActivity: matchedEntry?.activity || null,
        artiaRemoteHours: matchedEntry?.hours || 0,
        artiaRemoteStart: matchedEntry?.start || null,
        artiaRemoteEnd: matchedEntry?.end || null
      };
    });
  }

  async decorateEventsWithSyncStatus(events, params = {}) {
    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }

    const visibleRange = this.getVisibleRangeFromEvents(events);
    const result = await this.getWorkedTimeEntriesForUser({
      email: params.email,
      artiaUserId: params.artiaUserId,
      startDate: params.startDate || visibleRange.startDate,
      endDate: params.endDate || visibleRange.endDate
    });

    return this.decorateEventsWithTimeEntries(events, result.entries, result.source, result.reason);
  }
}
