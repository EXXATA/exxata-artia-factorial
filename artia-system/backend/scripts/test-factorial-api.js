import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

async function main() {
  const employeeId = process.argv[2] || '1370321'; // André
  const startDate = process.argv[3] || '2026-02-27';
  const endDate = process.argv[4] || '2026-02-28';

  const [{ FactorialService }] = await Promise.all([
    import('../src/infrastructure/external/FactorialService.js')
  ]);

  const factorialService = new FactorialService();
  const shifts = await factorialService.getShiftsByDateRange(
    employeeId,
    new Date(`${startDate}T00:00:00`),
    new Date(`${endDate}T00:00:00`)
  );

  console.log(JSON.stringify({
    employeeId,
    startDate,
    endDate,
    shiftsCount: shifts.length,
    shifts: shifts.map(s => ({
      id: s.id,
      employeeId: s.employeeId,
      day: s.day,
      clockIn: s.clockIn,
      clockOut: s.clockOut,
      workingHours: s.workingHours,
      observations: s.observations
    })),
    totalHours: shifts.reduce((sum, s) => sum + s.workingHours, 0)
  }, null, 2));
}

main().catch((error) => {
  console.error('[test-factorial-api] erro:', error);
  process.exit(1);
});
