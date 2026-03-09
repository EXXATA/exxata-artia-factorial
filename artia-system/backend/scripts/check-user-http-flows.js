import 'dotenv/config';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../src/infrastructure/database/supabase/UserRepository.js';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000';

function buildToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      factorialEmployeeId: user.factorialEmployeeId,
      artiaUserId: user.artiaUserId
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function main() {
  const email = process.argv[2] || 'andre.baptista@exxata.com.br';
  const startDate = process.argv[3] || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = process.argv[4] || new Date().toISOString().split('T')[0];

  const userRepository = new UserRepository();
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new Error(`Usuário ${email} não encontrado.`);
  }

  const token = buildToken(user);
  const client = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`
    },
    timeout: 60000
  });

  const result = {
    user: {
      id: user.id,
      email: user.email,
      factorialEmployeeId: user.factorialEmployeeId,
      artiaUserId: user.artiaUserId,
      hasPassword: Boolean(user.passwordHash)
    },
    range: { startDate, endDate },
    tabs: {}
  };

  const projectsResponse = await client.get('/api/v1/projects');
  const projects = projectsResponse.data?.data || [];
  result.tabs.directory = {
    route: '/directory',
    api: '/api/v1/projects',
    ok: projectsResponse.data?.success === true,
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => project.active !== false).length,
    inactiveProjects: projects.filter((project) => project.active === false).length
  };

  const firstProject = projects[0];
  if (firstProject) {
    const activitiesResponse = await client.get(`/api/v1/projects/${firstProject.id}/activities`);
    result.tabs.projectActivities = {
      route: 'lookup de atividades nas abas de criação/tabela/calendário',
      api: `/api/v1/projects/${firstProject.id}/activities`,
      ok: activitiesResponse.data?.success === true,
      projectId: firstProject.id,
      activityCount: (activitiesResponse.data?.data || []).length
    };
  }

  const eventsResponse = await client.get('/api/v1/events', {
    params: { startDate, endDate }
  });
  const events = eventsResponse.data?.data || [];
  result.tabs.calendar = {
    route: '/',
    api: '/api/v1/events',
    ok: eventsResponse.data?.success === true,
    eventCount: events.length
  };
  result.tabs.table = {
    route: '/table',
    api: '/api/v1/events',
    ok: eventsResponse.data?.success === true,
    eventCount: events.length
  };
  result.tabs.gantt = {
    route: '/gantt',
    api: '/api/v1/events',
    ok: eventsResponse.data?.success === true,
    eventCount: events.length
  };
  result.tabs.charts = {
    route: '/charts',
    api: '/api/v1/events',
    ok: eventsResponse.data?.success === true,
    eventCount: events.length
  };

  const comparisonResponse = await client.get('/api/v1/worked-hours/range', {
    params: { startDate, endDate, refresh: true }
  });
  const comparisonData = comparisonResponse.data?.data || {};
  result.tabs.workedHoursComparison = {
    route: '/comparison',
    api: '/api/v1/worked-hours/range',
    ok: comparisonResponse.data?.success === true,
    stats: comparisonData.stats || null,
    comparisonsCount: (comparisonData.comparisons || []).length,
    firstDays: (comparisonData.comparisons || []).slice(0, 5)
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const payload = error.response?.data || null;
  console.error('[check-user-http-flows] erro:', error.message);
  if (payload) {
    console.error(JSON.stringify(payload, null, 2));
  }
  process.exit(1);
});
