import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

function resolveRange(daysBack = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - daysBack);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

async function main() {
  const daysBack = Number(process.argv[2] || 30);
  const emailFilter = process.argv[3] || null;
  const range = resolveRange(daysBack);

  const [{ UserRepository }, { IntegrationSnapshotRepository }, { ArtiaHoursReadService }] = await Promise.all([
    import('../src/infrastructure/database/supabase/UserRepository.js'),
    import('../src/infrastructure/database/supabase/IntegrationSnapshotRepository.js'),
    import('../src/infrastructure/external/ArtiaHoursReadService.js')
  ]);

  const userRepository = new UserRepository();
  const snapshotRepository = new IntegrationSnapshotRepository();
  const artiaHoursReadService = new ArtiaHoursReadService();

  const users = emailFilter
    ? [await userRepository.findByEmail(emailFilter)].filter(Boolean)
    : await userRepository.findAll();

  const eligibleUsers = users.filter((user) => user?.artiaUserId);
  const output = [];
  const failures = [];

  for (const user of eligibleUsers) {
    try {
      const result = await artiaHoursReadService.getWorkedTimeEntriesForUser({
        email: user.email,
        artiaUserId: user.artiaUserId,
        startDate: range.startDate,
        endDate: range.endDate
      });

      const syncedAt = new Date().toISOString();
      await snapshotRepository.replaceArtiaTimeEntries(
        user.id,
        user.artiaUserId,
        range.startDate,
        range.endDate,
        result.entries,
        result.source?.tableName || null,
        syncedAt
      );

      const dailyPayload = snapshotRepository.buildArtiaDailyPayload(result.entries);
      await snapshotRepository.replaceArtiaDailyHours(
        user.id,
        user.artiaUserId,
        range.startDate,
        range.endDate,
        dailyPayload,
        result.source?.tableName || null,
        syncedAt
      );

      await snapshotRepository.upsertSyncState({
        resourceType: 'artia_time_entries',
        scopeKey: snapshotRepository.buildScopeKey('artia_time_entries', user.id, range.startDate, range.endDate),
        userId: user.id,
        syncStatus: result.reason ? 'degraded' : 'ready',
        lastSyncedAt: syncedAt,
        expiresAt: snapshotRepository.buildExpiry(syncedAt, 1),
        errorMessage: result.reason,
        metadata: {
          sourceTable: result.source?.tableName || null,
          entryCount: result.entries.length,
          reason: result.reason,
          startDate: range.startDate,
          endDate: range.endDate
        }
      });

      output.push({
        userId: user.id,
        email: user.email,
        artiaUserId: user.artiaUserId,
        sourceTable: result.source?.tableName || null,
        reason: result.reason,
        entries: result.entries.length,
        dailyRows: Object.keys(dailyPayload).length
      });
    } catch (error) {
      failures.push({
        userId: user.id,
        email: user.email,
        artiaUserId: user.artiaUserId,
        error: error.message
      });
    }
  }

  console.log(JSON.stringify({ range, processedUsers: output.length, failedUsers: failures.length, users: output, failures }, null, 2));
}

main().catch((error) => {
  console.error('[backfill-artia-caches] erro:', error);
  process.exit(1);
});
