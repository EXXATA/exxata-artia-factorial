import { artiaDB } from '../database/mysql/ArtiaDBConnection.js';

const USER_TABLE = 'organization_9115_organization_users_v2';
const SOURCE_CACHE_KEY = 'artia-project-access:source';
const SOURCE_CACHE_TTL_MS = 5 * 60 * 1000;
const USER_ACCESS_CACHE_TTL_MS = 5 * 60 * 1000;
const POSITIVE_TABLE_KEYWORDS = [
  'project member',
  'project members',
  'project access',
  'project permission',
  'permission',
  'permissions',
  'member',
  'members',
  'participant',
  'participants',
  'allocation',
  'allocations',
  'sharing',
  'association',
  'mapping',
  'relation'
];
const NEGATIVE_TABLE_KEYWORDS = [
  'time entry',
  'time entries',
  'timesheet',
  'hour',
  'hours',
  'worklog',
  'launch',
  'lancamento',
  'apont',
  'activity',
  'activities',
  'folder',
  'folders',
  'milestone',
  'milestones',
  'finance',
  'finances'
];
const ACTIVE_TEXT_VALUES = ['1', 'true', 'active', 'ativo', 'enabled'];

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeProjectId(value) {
  return String(value || '').trim();
}

export class ArtiaProjectAccessService {
  constructor(inMemoryCache = null) {
    this.inMemoryCache = inMemoryCache;
  }

  escapeIdentifier(identifier) {
    return `\`${String(identifier).replace(/`/g, '``')}\``;
  }

  normalizeCacheKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase();
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
      userIdColumn: this.pickColumn(columns, [
        'members_user_id',
        'member_user_id',
        'user_id',
        'responsible_user_id',
        'owner_id',
        'employee_id',
        'collaborator_id',
        'person_id',
        'resource_id',
        'created_by'
      ]),
      userEmailColumn: this.pickColumn(columns, [
        'member_email',
        'user_email',
        'employee_email',
        'collaborator_email',
        'responsible_email',
        'email'
      ]),
      projectIdColumn: this.pickColumn(columns, [
        'folder_last_project_id',
        'project_id',
        'parent_project_id',
        'parent_project',
        'folder_id',
        'parent_id'
      ]),
      activeColumn: this.pickColumn(columns, [
        'active',
        'status',
        'access_status',
        'member_status',
        'state'
      ]),
      roleColumn: this.pickColumn(columns, [
        'role',
        'permission',
        'access_level'
      ])
    };
  }

  scoreSource(source) {
    let score = 0;
    const tableName = normalizeText(source.tableName);

    if (source.projectIdColumn) {
      score += 5;
    }

    if (source.userIdColumn || source.userEmailColumn) {
      score += 5;
    }

    if (source.activeColumn) {
      score += 1;
    }

    if (source.roleColumn) {
      score += 1;
    }

    if (POSITIVE_TABLE_KEYWORDS.some((keyword) => tableName.includes(keyword))) {
      score += 5;
    }

    if (NEGATIVE_TABLE_KEYWORDS.some((keyword) => tableName.includes(keyword))) {
      score -= 6;
    }

    if (tableName.includes('project') && tableName.includes('user')) {
      score += 4;
    }

    if (tableName.includes('project') && tableName.includes('member')) {
      score += 4;
    }

    if (tableName.includes('project') && tableName.includes('permission')) {
      score += 4;
    }

    if (tableName.includes('organization users')) {
      score -= 4;
    }

    return score;
  }

  getConfiguredSource() {
    const tableName = process.env.ARTIA_DB_PROJECT_ACCESS_TABLE;
    if (!tableName) {
      return null;
    }

    return {
      tableName,
      userIdColumn: process.env.ARTIA_DB_PROJECT_ACCESS_USER_ID_COLUMN || null,
      userEmailColumn: process.env.ARTIA_DB_PROJECT_ACCESS_USER_EMAIL_COLUMN || null,
      projectIdColumn: process.env.ARTIA_DB_PROJECT_ACCESS_PROJECT_ID_COLUMN || null,
      activeColumn: process.env.ARTIA_DB_PROJECT_ACCESS_ACTIVE_COLUMN || null,
      roleColumn: process.env.ARTIA_DB_PROJECT_ACCESS_ROLE_COLUMN || null
    };
  }

  getCachedValue(cacheKey, producer, ttlMs, forceRefresh = false) {
    if (!this.inMemoryCache) {
      return producer();
    }

    if (forceRefresh) {
      this.inMemoryCache.delete(cacheKey);
    }

    return this.inMemoryCache.remember(cacheKey, producer, ttlMs);
  }

  async discoverProjectAccessSource({ forceRefresh = false } = {}) {
    return this.getCachedValue(
      SOURCE_CACHE_KEY,
      async () => {
        const configured = this.getConfiguredSource();
        if (configured?.tableName && configured?.projectIdColumn && (configured.userIdColumn || configured.userEmailColumn)) {
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
          .filter((candidate) => candidate.source.projectIdColumn)
          .filter((candidate) => candidate.source.userIdColumn || candidate.source.userEmailColumn)
          .filter((candidate) => candidate.score >= 8)
          .sort((left, right) => right.score - left.score);

        return candidates[0]?.source || null;
      },
      SOURCE_CACHE_TTL_MS,
      forceRefresh
    );
  }

  async resolveArtiaIdentity(user) {
    const artiaUserId = String(user?.artiaUserId || '').trim();
    const email = String(user?.email || '').trim().toLowerCase();

    if (artiaUserId) {
      return {
        artiaUserId,
        email
      };
    }

    if (!email) {
      return {
        artiaUserId: null,
        email: null
      };
    }

    try {
      const users = await artiaDB.query(
        `SELECT id, user_email AS email
         FROM ${USER_TABLE}
         WHERE user_email = ? AND status = 1
         LIMIT 1`,
        [email]
      );

      if (!users.length) {
        return {
          artiaUserId: null,
          email
        };
      }

      return {
        artiaUserId: String(users[0].id),
        email: String(users[0].email || email).trim().toLowerCase()
      };
    } catch (error) {
      return {
        artiaUserId: null,
        email
      };
    }
  }

  buildAccessQuery(source, identity) {
    const tableIdentifier = this.escapeIdentifier(source.tableName);
    const conditions = [];
    const params = [];

    if (source.userIdColumn && identity.artiaUserId) {
      conditions.push(`${this.escapeIdentifier(source.userIdColumn)} = ?`);
      params.push(identity.artiaUserId);
    }

    if (source.userEmailColumn && identity.email) {
      conditions.push(`LOWER(CAST(${this.escapeIdentifier(source.userEmailColumn)} AS CHAR)) = ?`);
      params.push(identity.email);
    }

    if (conditions.length === 0) {
      return null;
    }

    const activeCondition = this.buildActiveCondition(source.activeColumn);
    const whereClauses = [`(${conditions.join(' OR ')})`];

    if (activeCondition) {
      whereClauses.push(activeCondition);
    }

    return {
      sql: `
        SELECT DISTINCT CAST(${this.escapeIdentifier(source.projectIdColumn)} AS CHAR) AS projectId
        FROM ${tableIdentifier}
        WHERE ${whereClauses.join(' AND ')}
      `,
      params
    };
  }

  buildActiveCondition(activeColumn) {
    if (!activeColumn) {
      return '';
    }

    const identifier = this.escapeIdentifier(activeColumn);
    const textValues = ACTIVE_TEXT_VALUES.map((value) => `'${value}'`).join(', ');

    return `(
      ${identifier} IS NULL
      OR ${identifier} = 1
      OR ${identifier} = TRUE
      OR LOWER(CAST(${identifier} AS CHAR)) IN (${textValues})
    )`;
  }

  async getAccessibleProjectIdsForUser(user, { forceRefresh = false } = {}) {
    const identity = await this.resolveArtiaIdentity(user);
    const cacheKey = `artia-project-access:user:${this.normalizeCacheKey(identity.artiaUserId || identity.email || 'anonymous')}`;

    return this.getCachedValue(
      cacheKey,
      async () => {
        if (!identity.artiaUserId && !identity.email) {
          return {
            projectIds: [],
            source: null,
            reason: 'missing_artia_identity'
          };
        }

        const source = await this.discoverProjectAccessSource({ forceRefresh });
        if (!source) {
          return {
            projectIds: [],
            source: null,
            reason: 'project_access_source_not_found'
          };
        }

        const query = this.buildAccessQuery(source, identity);
        if (!query) {
          return {
            projectIds: [],
            source,
            reason: 'project_access_query_not_buildable'
          };
        }

        const rows = await artiaDB.query(query.sql, query.params);
        const projectIds = Array.from(
          new Set(
            (rows || [])
              .map((row) => normalizeProjectId(row.projectId))
              .filter(Boolean)
          )
        );

        return {
          projectIds,
          source,
          reason: projectIds.length > 0 ? null : 'no_explicit_project_access'
        };
      },
      USER_ACCESS_CACHE_TTL_MS,
      forceRefresh
    );
  }
}
