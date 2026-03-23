export class CachedProjectAccessService {
  constructor({
    projectionRepository,
    snapshotRepository,
    artiaProjectAccessService,
    ttlHours = 6
  }) {
    this.projectionRepository = projectionRepository;
    this.snapshotRepository = snapshotRepository;
    this.artiaProjectAccessService = artiaProjectAccessService;
    this.ttlHours = ttlHours;
  }

  isForceRefresh(value) {
    return value === true || value === 'true' || value === '1' || value === 1;
  }

  buildScopeKey(userId) {
    return `user_project_access:${userId}`;
  }

  async getAccessibleProjectIdsForUser(user, { forceRefresh = false } = {}) {
    const shouldForceRefresh = this.isForceRefresh(forceRefresh);
    const scopeKey = this.buildScopeKey(user.id);

    const [rows, syncState] = await Promise.all([
      this.projectionRepository.listProjectAccess(user.id),
      this.snapshotRepository.getSyncState('user_project_access', scopeKey)
    ]);

    if (!shouldForceRefresh && syncState && this.snapshotRepository.isFresh(syncState)) {
      return {
        projectIds: rows.map((row) => row.projectId),
        source: syncState.metadata?.source || null,
        reason: syncState.metadata?.reason || null,
        lastSyncedAt: syncState.last_synced_at
      };
    }

    const access = await this.artiaProjectAccessService.getAccessibleProjectIdsForUser(user, {
      forceRefresh: shouldForceRefresh
    });
    const syncedAt = new Date().toISOString();

    await this.projectionRepository.replaceProjectAccess(user.id, access.projectIds || [], {
      source: access.source?.tableName || 'artia_mysql',
      syncedAt
    });

    await this.snapshotRepository.upsertSyncState({
      resourceType: 'user_project_access',
      scopeKey,
      userId: user.id,
      syncStatus: access.reason ? 'degraded' : 'ready',
      lastSyncedAt: syncedAt,
      expiresAt: this.snapshotRepository.buildExpiry(syncedAt, this.ttlHours),
      errorMessage: access.reason,
      metadata: {
        source: access.source?.tableName || null,
        projectCount: access.projectIds?.length || 0,
        reason: access.reason || null
      }
    });

    return {
      projectIds: access.projectIds || [],
      source: access.source || null,
      reason: access.reason || null,
      lastSyncedAt: syncedAt
    };
  }
}
