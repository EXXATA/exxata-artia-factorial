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

  const [{ UserRepository }, { IntegrationSnapshotRepository }, { FactorialService }] = await Promise.all([
    import('../src/infrastructure/database/supabase/UserRepository.js'),
    import('../src/infrastructure/database/supabase/IntegrationSnapshotRepository.js'),
    import('../src/infrastructure/external/FactorialService.js')
  ]);

  const userRepository = new UserRepository();
  const snapshotRepository = new IntegrationSnapshotRepository();
  const factorialService = new FactorialService();

  const users = emailFilter
    ? [await userRepository.findByEmail(emailFilter)].filter(Boolean)
    : await userRepository.findAll();

  const eligibleUsers = users.filter((user) => user?.factorialEmployeeId);
  const output = [];
  const failures = [];

  for (const user of eligibleUsers) {
    try {
      const shifts = await factorialService.getShiftsByDateRange(
        user.factorialEmployeeId,
        new Date(`${range.startDate}T00:00:00`),
        new Date(`${range.endDate}T00:00:00`)
      );

      const hoursByDay = shifts.reduce((accumulator, shift) => {
        if (!shift.day) {
          return accumulator;
        }

        accumulator[shift.day] = (accumulator[shift.day] || 0) + (shift.workingHours || 0);
        return accumulator;
      }, {});

      const syncedAt = new Date().toISOString();
      await snapshotRepository.replaceFactorialDailyHours(
        user.id,
        user.factorialEmployeeId,
        range.startDate,
        range.endDate,
        hoursByDay,
        syncedAt
      );

      await snapshotRepository.upsertSyncState({
        resourceType: 'factorial_daily_hours',
        scopeKey: snapshotRepository.buildScopeKey('factorial_daily_hours', user.id, range.startDate, range.endDate),
        userId: user.id,
        syncStatus: 'ready',
        lastSyncedAt: syncedAt,
        expiresAt: snapshotRepository.buildExpiry(syncedAt, 1),
        metadata: {
          startDate: range.startDate,
          endDate: range.endDate,
          days: Object.keys(hoursByDay).length
        }
      });

      output.push({
        userId: user.id,
        email: user.email,
        factorialEmployeeId: user.factorialEmployeeId,
        shifts: shifts.length,
        dailyRows: Object.keys(hoursByDay).length,
        totalHours: Object.values(hoursByDay).reduce((sum, h) => sum + h, 0)
      });
    } catch (error) {
      failures.push({
        userId: user.id,
        email: user.email,
        factorialEmployeeId: user.factorialEmployeeId,
        error: error.message
      });
    }
  }

  console.log(JSON.stringify({ range, processedUsers: output.length, failedUsers: failures.length, users: output, failures }, null, 2));
}

main().catch((error) => {
  console.error('[backfill-factorial-cache] erro:', error);
  process.exit(1);
});
