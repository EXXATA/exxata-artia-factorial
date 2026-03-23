import test from 'node:test';
import assert from 'node:assert/strict';
import { EventValidationService } from '../../src/domain/services/EventValidationService.js';

test('EventValidationService accepts events with one minute duration', () => {
  const service = new EventValidationService();
  const event = {
    getDurationInMinutes() {
      return 1;
    }
  };

  assert.equal(service.validateDuration(event), true);
});

test('EventValidationService still rejects zero minute events', () => {
  const service = new EventValidationService();
  const event = {
    getDurationInMinutes() {
      return 0;
    }
  };

  assert.throws(
    () => service.validateDuration(event),
    /at least 1 minutes/
  );
});
