import 'dotenv/config';
import { UserRepository } from '../src/infrastructure/database/supabase/UserRepository.js';
import { IntegrationSnapshotRepository } from '../src/infrastructure/database/supabase/IntegrationSnapshotRepository.js';
import { EventRepository } from '../src/infrastructure/database/supabase/EventRepository.js';
import { ArtiaDBService } from '../src/infrastructure/external/ArtiaDBService.js';
import { ArtiaHoursReadService } from '../src/infrastructure/external/ArtiaHoursReadService.js';
import { FactorialService } from '../src/infrastructure/external/FactorialService.js';
import { InMemoryTtlCache } from '../src/infrastructure/cache/InMemoryTtlCache.js';
import { IntegrationReadModelService } from '../src/application/services/IntegrationReadModelService.js';
import { GetWorkedHoursComparisonUseCase } from '../src/application/use-cases/hours/GetWorkedHoursComparisonUseCase.js';

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
  const email = process.argv[2] || 'andre.baptista@exxata.com.br';
  const daysBack = Number(process.argv[3] || 30);
  const range = resolveRange(daysBack);

  const userRepository = new UserRepository();
  const snapshotRepository = new IntegrationSnapshotRepository();
  const eventRepository = new EventRepository();
  const artiaDBService = new ArtiaDBService();
  const artiaHoursReadService = new ArtiaHoursReadService();
  const factorialService = new FactorialService();
  const inMemoryCache = new InMemoryTtlCache();
  const integrationReadModelService = new IntegrationReadModelService({
    snapshotRepository,
    artiaDBService,
    factorialService,
    artiaHoursReadService,
    inMemoryCache
  });
  const comparisonUseCase = new GetWorkedHoursComparisonUseCase(
    eventRepository,
    userRepository,
    integrationReadModelService
  );

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error(`Usuário ${email} não encontrado no Supabase.`);
  }

  const projectCatalog = await integrationReadModelService.getProjectCatalog({ forceRefresh: true });
  const comparison = await comparisonUseCase.execute(user.id, {
    startDate: range.startDate,
    endDate: range.endDate,
    forceRefresh: true
  });
  const events = await eventRepository.findByDateRange(range.startDate, range.endDate, user.id);

  const divergences = comparison.comparisons.filter((item) => item.hasDivergence);
  const pending = comparison.comparisons.filter((item) => item.hasPendingSync);

  console.log(JSON.stringify({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      factorialEmployeeId: user.factorialEmployeeId,
      artiaUserId: user.artiaUserId,
      hasPassword: Boolean(user.passwordHash)
    },
    range,
    projectCatalog: {
      totalProjects: projectCatalog.length,
      activeProjects: projectCatalog.filter((project) => project.active !== false).length,
      inactiveProjects: projectCatalog.filter((project) => project.active === false).length
    },
    localEvents: {
      count: events.length,
      sample: events.slice(0, 5).map((event) => event.toJSON())
    },
    comparisonStats: comparison.stats,
    divergences: divergences.slice(0, 10),
    pending: pending.slice(0, 10)
  }, null, 2));
}

main().catch((error) => {
  console.error('[analyze-user-functional] erro:', error);
  process.exit(1);
});
