export class WorkedHoursComparison {
  constructor({
    date,
    factorialHours,
    artiaHours,
    systemHours,
    syncedSystemHours,
    pendingSystemHours,
    manualSystemHours,
    artiaEntryCount
  }) {
    this.date = date instanceof Date ? date : new Date(date);
    this.factorialHours = factorialHours || 0;
    this.artiaHours = artiaHours || 0;
    this.systemHours = systemHours || 0;
    this.syncedSystemHours = syncedSystemHours || 0;
    this.pendingSystemHours = pendingSystemHours || 0;
    this.manualSystemHours = manualSystemHours || 0;
    this.artiaEntryCount = artiaEntryCount || 0;
    this.difference = this.artiaHours - this.factorialHours;
    this.systemDifference = this.systemHours - this.artiaHours;
    this.hasPendingSync = this.pendingSystemHours > 0;
    this.hasDivergence = this.hasPendingSync || Math.abs(this.difference) > 0.001 || Math.abs(this.systemDifference) > 0.001;
    this.status = this.hasPendingSync ? 'pending_sync' : (this.hasDivergence ? 'divergence' : 'match');
  }

  getDifferenceInMinutes() {
    return Math.round(this.difference * 60);
  }

  getAbsoluteDifference() {
    return Math.abs(this.difference);
  }

  getStatusColor() {
    if (this.status === 'pending_sync') {
      return 'amber';
    }

    return this.hasDivergence ? 'red' : 'green';
  }

  getFormattedDate() {
    return this.date.toISOString().split('T')[0];
  }

  toJSON() {
    return {
      date: this.getFormattedDate(),
      factorialHours: this.factorialHours,
      artiaHours: this.artiaHours,
      systemHours: this.systemHours,
      syncedSystemHours: this.syncedSystemHours,
      pendingSystemHours: this.pendingSystemHours,
      manualSystemHours: this.manualSystemHours,
      artiaEntryCount: this.artiaEntryCount,
      difference: this.difference,
      systemDifference: this.systemDifference,
      hasPendingSync: this.hasPendingSync,
      hasDivergence: this.hasDivergence,
      status: this.status,
      statusColor: this.getStatusColor()
    };
  }
}
