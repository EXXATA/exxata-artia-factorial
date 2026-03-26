import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../src/services/api/client.js';
import { viewService } from '../src/services/api/viewService.js';

test('viewService envia projectKey e activityKey para os endpoints do read-side', async () => {
  const originalGet = apiClient.get;
  const calls = [];

  apiClient.get = async (url, config) => {
    calls.push({ url, config });
    return {
      data: {
        success: true,
        data: {}
      }
    };
  };

  try {
    await viewService.getWeekView({
      startDate: '2026-03-23',
      endDate: '2026-03-29',
      projectKey: 'project-alpha',
      activityKey: 'activity-dev',
      refresh: true
    });

    await viewService.getRangeSummary({
      startDate: '2026-03-01',
      endDate: '2026-03-29',
      projectKey: 'project-alpha'
    });

    assert.deepEqual(calls, [
      {
        url: '/views/week',
        config: {
          params: {
            startDate: '2026-03-23',
            endDate: '2026-03-29',
            projectKey: 'project-alpha',
            activityKey: 'activity-dev',
            refresh: true
          }
        }
      },
      {
        url: '/views/range-summary',
        config: {
          params: {
            startDate: '2026-03-01',
            endDate: '2026-03-29',
            projectKey: 'project-alpha'
          }
        }
      }
    ]);
  } finally {
    apiClient.get = originalGet;
  }
});
