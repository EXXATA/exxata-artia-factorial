export class CSVGenerator {
  generate(events, email = '') {
    const rows = [];

    rows.push([
      'Data',
      'Projeto',
      'Hora Início',
      'Hora de Término',
      'Esforço',
      'Esforço Dia',
      'Atividade',
      'Observação',
      'Artia',
      'ID da Atividade',
      'E-mail'
    ]);

    const eventsByDay = this.groupEventsByDay(events);

    events.forEach(event => {
      const dayDate = this.parseISOToLocalDate(event.timeRange.day);
      const durMin = Math.max(0, event.getDurationInMinutes());

      rows.push([
        this.formatDateBR(dayDate),
        event.project || '',
        this.getStartHHMM(event),
        this.getEndHHMM(event),
        this.minutesToHHMM(durMin),
        this.formatWorkedHM(eventsByDay[event.timeRange.day] || 0),
        event.activity.label || '',
        event.notes || '',
        event.artiaLaunched ? 'Sim' : '',
        event.activity.id || '',
        email
      ]);
    });

    const csvBody = rows.map(row => row.map(value => this.csvEscape(value)).join(';')).join('\n');
    const csvWithBom = '\uFEFF' + csvBody;

    return Buffer.from(csvWithBom, 'utf-8');
  }

  groupEventsByDay(events) {
    const grouped = {};

    events.forEach(event => {
      const day = event.timeRange.day;

      if (!grouped[day]) {
        grouped[day] = 0;
      }

      grouped[day] += event.getDurationInMinutes();
    });

    return grouped;
  }

  getStartHHMM(event) {
    const minutes = this.clampMinutesToDay(this.minutesFromDayStart(event.timeRange.start, event.timeRange.day));
    return this.formatTimeFromMinutes(minutes);
  }

  getEndHHMM(event) {
    const minutes = this.clampMinutesToDay(this.minutesFromDayStart(event.timeRange.end, event.timeRange.day));
    return this.formatTimeFromMinutes(minutes);
  }

  minutesFromDayStart(dateTime, dayIso) {
    const base = this.parseISOToLocalDate(dayIso);
    return Math.round((dateTime.getTime() - base.getTime()) / 60000);
  }

  clampMinutesToDay(minutes) {
    if (minutes < 0) {
      return 0;
    }

    if (minutes > 1440) {
      return 1440;
    }

    return minutes;
  }

  formatTimeFromMinutes(minutes) {
    if (minutes === 1440) {
      return '24:00';
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  formatWorkedHM(minutes) {
    return this.minutesToHHMM(minutes);
  }

  csvEscape(value) {
    const stringValue = String(value ?? '');

    if (/["\n\r;]/.test(stringValue)) {
      return '"' + stringValue.replaceAll('"', '""') + '"';
    }

    return stringValue;
  }

  parseISOToLocalDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  formatDateBR(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  minutesToHHMM(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}
