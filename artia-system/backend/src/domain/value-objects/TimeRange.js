export class TimeRange {
  constructor(start, end, day) {
    if (!(start instanceof Date)) {
      throw new Error('Start must be a Date object');
    }
    if (!(end instanceof Date)) {
      throw new Error('End must be a Date object');
    }
    if (!day || typeof day !== 'string') {
      throw new Error('Day must be a string in YYYY-MM-DD format');
    }

    this.start = start;
    this.end = end;
    this.day = day;

    this.validate();
  }

  validate() {
    if (this.start >= this.end) {
      throw new Error('Start time must be before end time');
    }

    const durationMinutes = this.getDurationInMinutes();
    if (durationMinutes <= 0) {
      throw new Error('Duration must be greater than zero');
    }
  }

  getDurationInMinutes() {
    return Math.round((this.end.getTime() - this.start.getTime()) / 60000);
  }

  getDurationInHours() {
    return this.getDurationInMinutes() / 60;
  }

  overlaps(otherTimeRange) {
    if (this.day !== otherTimeRange.day) {
      return false;
    }
    return this.start < otherTimeRange.end && this.end > otherTimeRange.start;
  }

  contains(dateTime) {
    return dateTime >= this.start && dateTime <= this.end;
  }

  equals(otherTimeRange) {
    return (
      this.start.getTime() === otherTimeRange.start.getTime() &&
      this.end.getTime() === otherTimeRange.end.getTime() &&
      this.day === otherTimeRange.day
    );
  }

  toJSON() {
    return {
      start: this.start.toISOString(),
      end: this.end.toISOString(),
      day: this.day
    };
  }
}
