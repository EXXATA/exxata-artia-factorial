export class Event {
  constructor({
    id,
    userId,
    timeRange,
    project,
    activity,
    notes = '',
    artiaLaunched = false,
    workplace = null,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.userId = userId;
    this.timeRange = timeRange;
    this.project = project;
    this.activity = activity;
    this.notes = notes;
    this.artiaLaunched = artiaLaunched;
    this.workplace = workplace;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  validate() {
    if (!this.id) {
      throw new Error('Event ID is required');
    }
    if (!this.userId) {
      throw new Error('User ID is required');
    }
    if (!this.timeRange) {
      throw new Error('TimeRange is required');
    }
    if (!this.project) {
      throw new Error('Project is required');
    }
    if (!this.activity) {
      throw new Error('Activity is required');
    }
  }

  getDurationInMinutes() {
    return this.timeRange.getDurationInMinutes();
  }

  getDurationInHours() {
    return this.timeRange.getDurationInHours();
  }

  overlaps(otherEvent) {
    if (this.timeRange.day !== otherEvent.timeRange.day) {
      return false;
    }
    return this.timeRange.overlaps(otherEvent.timeRange);
  }

  updateTimeRange(newTimeRange) {
    this.timeRange = newTimeRange;
    this.updatedAt = new Date();
    this.validate();
  }

  updateProject(project) {
    this.project = project;
    this.updatedAt = new Date();
  }

  updateActivity(activity) {
    this.activity = activity;
    this.updatedAt = new Date();
  }

  updateNotes(notes) {
    this.notes = notes;
    this.updatedAt = new Date();
  }

  toggleArtiaLaunched() {
    this.artiaLaunched = !this.artiaLaunched;
    this.updatedAt = new Date();
  }

  setWorkplace(workplace) {
    this.workplace = workplace;
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      start: this.timeRange.start.toISOString(),
      end: this.timeRange.end.toISOString(),
      day: this.timeRange.day,
      project: this.project,
      activityId: this.activity.id,
      activityLabel: this.activity.label,
      notes: this.notes,
      artiaLaunched: this.artiaLaunched,
      workplace: this.workplace,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
