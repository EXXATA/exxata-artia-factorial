export class DateRange {
  constructor(startDate, endDate) {
    if (!(startDate instanceof Date)) {
      throw new Error('Start date must be a Date object');
    }
    if (!(endDate instanceof Date)) {
      throw new Error('End date must be a Date object');
    }

    this.startDate = startDate;
    this.endDate = endDate;

    this.validate();
  }

  validate() {
    if (this.startDate > this.endDate) {
      throw new Error('Start date must be before or equal to end date');
    }
  }

  getDurationInDays() {
    const diffTime = Math.abs(this.endDate - this.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  contains(date) {
    return date >= this.startDate && date <= this.endDate;
  }

  overlaps(otherDateRange) {
    return this.startDate <= otherDateRange.endDate && this.endDate >= otherDateRange.startDate;
  }

  equals(otherDateRange) {
    return (
      this.startDate.getTime() === otherDateRange.startDate.getTime() &&
      this.endDate.getTime() === otherDateRange.endDate.getTime()
    );
  }

  toJSON() {
    return {
      startDate: this.startDate.toISOString().split('T')[0],
      endDate: this.endDate.toISOString().split('T')[0]
    };
  }
}
