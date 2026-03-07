export class EventValidationService {
  validateNoOverlap(event, existingEvents) {
    const overlappingEvents = existingEvents.filter(existing => {
      if (existing.id === event.id) {
        return false;
      }
      return event.overlaps(existing);
    });

    if (overlappingEvents.length > 0) {
      throw new Error('Event overlaps with existing events');
    }

    return true;
  }

  validateDuration(event, minMinutes = 10, maxMinutes = 1440) {
    const duration = event.getDurationInMinutes();

    if (duration < minMinutes) {
      throw new Error(`Event duration must be at least ${minMinutes} minutes`);
    }

    if (duration > maxMinutes) {
      throw new Error(`Event duration cannot exceed ${maxMinutes} minutes`);
    }

    return true;
  }

  validateTimeRange(timeRange) {
    const startHour = timeRange.start.getHours();
    const endHour = timeRange.end.getHours();

    if (startHour < 0 || startHour > 23) {
      throw new Error('Invalid start hour');
    }

    if (endHour < 0 || endHour > 24) {
      throw new Error('Invalid end hour');
    }

    return true;
  }

  validateEvent(event, existingEvents = []) {
    this.validateTimeRange(event.timeRange);
    this.validateDuration(event);
    this.validateNoOverlap(event, existingEvents);
    return true;
  }
}
