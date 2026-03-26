import { ArtiaHoursReadService } from '../src/infrastructure/external/ArtiaHoursReadService.js';
import { ArtiaDBService } from '../src/infrastructure/external/ArtiaDBService.js';
import { ArtiaProjectAccessService } from '../src/infrastructure/external/ArtiaProjectAccessService.js';
import { FactorialService } from '../src/infrastructure/external/FactorialService.js';
import { InMemoryTtlCache } from '../src/infrastructure/cache/InMemoryTtlCache.js';
import { IntegrationSnapshotRepository } from '../src/infrastructure/database/supabase/IntegrationSnapshotRepository.js';
import { UserProjectionRepository } from '../src/infrastructure/database/supabase/UserProjectionRepository.js';
import { UserRepository } from '../src/infrastructure/database/supabase/UserRepository.js';
import { assertServiceRoleConfigured, supabase } from '../src/infrastructure/database/supabase/supabaseClient.js';
import { AccessibleProjectCatalogService } from '../src/application/services/AccessibleProjectCatalogService.js';
import { CachedProjectAccessService } from '../src/application/services/CachedProjectAccessService.js';
import { IntegrationReadModelService } from '../src/application/services/IntegrationReadModelService.js';
import { UserReadProjectionService } from '../src/application/services/UserReadProjectionService.js';
import { EventRepository } from '../src/infrastructure/database/supabase/EventRepository.js';

const PAGE_SIZE = 1000;

function parseArguments(argv) {
  const options = {
    startDate: null,
    endDate: null,
    userId: null
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--startDate=')) {
      options.startDate = arg.split('=')[1] || null;
    }

    if (arg.startsWith('--endDate=')) {
      options.endDate = arg.split('=')[1] || null;
    }

    if (arg.startsWith('--userId=')) {
      options.userId = arg.split('=')[1] || null;
    }
  });

  return options;
}

async function fetchProjectionScopeRows({ startDate, endDate, userId }) {
  const rows = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('user_day_rollups')
      .select('user_id, day')
      .order('user_id', { ascending: true })
      .order('day', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (startDate) {
      query = query.gte('day', startDate);
    }

    if (endDate) {
      query = query.lte('day', endDate);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const page = data || [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }

    from += PAGE_SIZE;
  }
}

function groupDaysByUser(rows) {
  return rows.reduce((accumulator, row) => {
    const userId = String(row.user_id || '').trim();
    const day = String(row.day || '').trim();

    if (!userId || !day) {
      return accumulator;
    }

    if (!accumulator.has(userId)) {
      accumulator.set(userId, new Set());
    }

    accumulator.get(userId).add(day);
    return accumulator;
  }, new Map());
}

function buildProjectionService() {
  const snapshotRepository = new IntegrationSnapshotRepository();
  const projectionRepository = new UserProjectionRepository();
  const userRepository = new UserRepository();
  const eventRepository = new EventRepository();
  const artiaHoursReadService = new ArtiaHoursReadService();
  const inMemoryCache = new InMemoryTtlCache();
  const artiaProjectAccessService = new ArtiaProjectAccessService(inMemoryCache);
  const integrationReadModelService = new IntegrationReadModelService({
    snapshotRepository,
    artiaDBService: new ArtiaDBService(),
    factorialService: new FactorialService(),
    artiaHoursReadService,
    inMemoryCache
  });
  const cachedProjectAccessService = new CachedProjectAccessService({
    projectionRepository,
    snapshotRepository,
    artiaProjectAccessService
  });
  const accessibleProjectCatalogService = new AccessibleProjectCatalogService(
    integrationReadModelService,
    cachedProjectAccessService
  );

  return new UserReadProjectionService({
    userRepository,
    eventRepository,
    projectionRepository,
    snapshotRepository,
    integrationReadModelService,
    accessibleProjectCatalogService,
    cachedProjectAccessService,
    artiaHoursReadService
  });
}

async function main() {
  assertServiceRoleConfigured('rebuild view projections');

  const options = parseArguments(process.argv.slice(2));
  const projectionRows = await fetchProjectionScopeRows(options);
  const daysByUser = groupDaysByUser(projectionRows);
  const projectionService = buildProjectionService();

  if (daysByUser.size === 0) {
    console.log('No user_day_rollups rows found for the requested scope.');
    return;
  }

  for (const [userId, days] of daysByUser.entries()) {
    const orderedDays = Array.from(days).sort();
    console.log(`Recomputing ${orderedDays.length} day(s) for user ${userId}...`);
    await projectionService.recomputeDaysForUser(userId, orderedDays, { forceRefresh: true });
  }

  console.log(`Recomputed projections for ${daysByUser.size} user(s).`);
}

main().catch((error) => {
  console.error('Failed to rebuild view projections:', error);
  process.exit(1);
});
