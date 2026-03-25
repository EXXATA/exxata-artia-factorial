import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendarDayBuckets } from '../src/utils/eventViewUtils.js';

test('buildCalendarDayBuckets precomputes sorted events and remote entry layouts by day', () => {
  const result = buildCalendarDayBuckets({
    weekDays: [
      new Date(2026, 2, 23),
      new Date(2026, 2, 24)
    ],
    events: [
      {
        id: 'evt-2',
        day: '2026-03-23',
        start: '2026-03-23T10:00:00.000Z',
        end: '2026-03-23T11:00:00.000Z'
      },
      {
        id: 'evt-1',
        day: '2026-03-23',
        start: '2026-03-23T08:00:00.000Z',
        end: '2026-03-23T09:00:00.000Z'
      }
    ],
    dailyDetailsByDate: {
      '2026-03-23': {
        artiaHours: 2,
        remoteOnlyArtiaEntries: [
          {
            id: 'remote-hidden',
            day: '2026-03-23',
            start: '2026-03-24T00:00:00.000Z',
            end: '2026-03-24T00:00:00.000Z'
          },
          {
            id: 'remote-visible',
            day: '2026-03-23',
            start: '2026-03-23T12:00:00.000Z',
            end: '2026-03-23T13:00:00.000Z'
          }
        ]
      }
    },
    minutesByDay: {
      '2026-03-23': 120
    },
    syncBreakdownByDay: {
      '2026-03-23': {
        totalMinutes: 120,
        syncedMinutes: 60,
        pendingMinutes: 60,
        manualMinutes: 0
      }
    }
  });

  assert.equal(result['2026-03-23'].dayMinutes, 120);
  assert.equal(result['2026-03-23'].artiaMinutes, 120);
  assert.deepEqual(
    result['2026-03-23'].dayEvents.map((event) => event.id),
    ['evt-1', 'evt-2']
  );
  assert.deepEqual(
    result['2026-03-23'].remoteEntryLayouts.map(({ entry }) => entry.id),
    ['remote-visible']
  );
  assert.deepEqual(
    result['2026-03-23'].unpositionedRemoteEntries.map((entry) => entry.id),
    ['remote-hidden']
  );
  assert.equal(result['2026-03-24'].dayEvents.length, 0);
  assert.equal(result['2026-03-24'].remoteEntryLayouts.length, 0);
});
