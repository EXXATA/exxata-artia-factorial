export class TimeCalculationService {
  calculateTotalHoursForDay(events, day) {
    const dayEvents = events.filter(event => event.timeRange.day === day);
    const totalMinutes = dayEvents.reduce((sum, event) => {
      return sum + event.getDurationInMinutes();
    }, 0);
    return totalMinutes / 60;
  }

  calculateTotalHoursForWeek(events, weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekEvents = events.filter(event => {
      const eventDate = new Date(event.timeRange.day);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    const totalMinutes = weekEvents.reduce((sum, event) => {
      return sum + event.getDurationInMinutes();
    }, 0);

    return totalMinutes / 60;
  }

  calculateTotalHoursForProject(events, projectNumber) {
    const projectEvents = events.filter(event => event.project === projectNumber);
    const totalMinutes = projectEvents.reduce((sum, event) => {
      return sum + event.getDurationInMinutes();
    }, 0);
    return totalMinutes / 60;
  }

  calculateTotalHoursForDateRange(events, dateRange) {
    const rangeEvents = events.filter(event => {
      const eventDate = new Date(event.timeRange.day);
      return dateRange.contains(eventDate);
    });

    const totalMinutes = rangeEvents.reduce((sum, event) => {
      return sum + event.getDurationInMinutes();
    }, 0);

    return totalMinutes / 60;
  }

  groupEventsByDay(events) {
    const grouped = {};
    
    events.forEach(event => {
      const day = event.timeRange.day;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(event);
    });

    return grouped;
  }

  groupEventsByProject(events) {
    const grouped = {};
    
    events.forEach(event => {
      const project = event.project;
      if (!grouped[project]) {
        grouped[project] = [];
      }
      grouped[project].push(event);
    });

    return grouped;
  }

  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}
