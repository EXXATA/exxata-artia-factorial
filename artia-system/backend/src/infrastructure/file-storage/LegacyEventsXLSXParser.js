import ExcelJS from 'exceljs';

const HEADER_LABELS = {
  data: ['data'],
  projeto: ['projeto'],
  inicio: ['hora início', 'hora inicio', 'início', 'inicio'],
  fim: ['hora de término', 'hora de termino', 'término', 'termino', 'fim'],
  atividade: ['atividade'],
  observacao: ['observação', 'observacao'],
  artiaLancado: ['lançamento artia', 'lancamento artia', 'artia'],
  id: ['id da atividade', 'id', 'id atividade']
};

export class LegacyEventsXLSXParser {
  async parse(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets.find(
      sheet => this.normalizeKey(sheet.name) === 'atividades'
    );

    if (!worksheet) {
      throw new Error('Não encontrei a aba "atividades" dentro do XLSX.');
    }

    const rows = this.extractRows(worksheet);

    if (!rows.length) {
      throw new Error('A aba parece vazia.');
    }

    const { headerRowIndex, colMap } = this.findHeaderMapping(rows);

    if (headerRowIndex < 0) {
      throw new Error('Não encontrei o cabeçalho (linha com "Data" e "Projeto").');
    }

    const events = this.buildEventsFromRows(rows, headerRowIndex, colMap);

    if (!events.length) {
      throw new Error('Não encontrei linhas válidas para importar.');
    }

    return events;
  }

  extractRows(worksheet) {
    const rows = [];

    worksheet.eachRow({ includeEmpty: false }, row => {
      const rowData = {};

      row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
        rowData[this.columnToLetter(columnNumber)] = this.normalizeCellValue(cell.value);
      });

      if (Object.keys(rowData).length > 0) {
        rows.push(rowData);
      }
    });

    return rows;
  }

  normalizeCellValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'object') {
      if (Array.isArray(value.richText)) {
        return value.richText.map(part => part.text || '').join('').trim();
      }

      if (typeof value.text === 'string') {
        return value.text.trim();
      }

      if (value.result !== undefined && value.result !== null) {
        return this.normalizeCellValue(value.result);
      }

      if (typeof value.hyperlink === 'string') {
        return value.hyperlink.trim();
      }
    }

    return value;
  }

  findHeaderMapping(rows) {
    for (let index = 0; index < rows.length; index += 1) {
      const entries = Object.entries(rows[index]);
      const normalizedEntries = entries.map(([column, value]) => [column, this.normalizeKey(value)]);
      const hasData = normalizedEntries.some(([, value]) => value === 'data');
      const hasProject = normalizedEntries.some(([, value]) => value === 'projeto');

      if (!hasData || !hasProject) {
        continue;
      }

      const colMap = {};

      for (const [column, value] of normalizedEntries) {
        for (const [field, options] of Object.entries(HEADER_LABELS)) {
          if (options.includes(value) && !colMap[field]) {
            colMap[field] = column;
          }
        }
      }

      return { headerRowIndex: index, colMap };
    }

    return { headerRowIndex: -1, colMap: {} };
  }

  buildEventsFromRows(rows, headerRowIndex, colMap) {
    const imported = [];

    for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
      const row = rows[index];
      const rawDate = this.getByCol(row, colMap.data);
      const rawProject = this.getByCol(row, colMap.projeto);
      const rawStart = this.getByCol(row, colMap.inicio);
      const rawEnd = this.getByCol(row, colMap.fim);
      const rawActivity = this.getByCol(row, colMap.atividade);
      const rawNotes = this.getByCol(row, colMap.observacao);
      const rawArtiaLaunched = this.getByCol(row, colMap.artiaLancado);
      const rawActivityId = this.getByCol(row, colMap.id);

      if (
        this.isEmptyValue(rawDate) &&
        this.isEmptyValue(rawProject) &&
        this.isEmptyValue(rawStart) &&
        this.isEmptyValue(rawEnd) &&
        this.isEmptyValue(rawActivity) &&
        this.isEmptyValue(rawNotes) &&
        this.isEmptyValue(rawArtiaLaunched) &&
        this.isEmptyValue(rawActivityId)
      ) {
        continue;
      }

      const day = this.parseAnyDateToISO(rawDate);

      if (!day) {
        continue;
      }

      const startMinutes = this.parseAnyTimeToMinutes(rawStart);
      const endMinutes = this.parseAnyTimeToMinutes(rawEnd);

      if (startMinutes === null || endMinutes === null) {
        continue;
      }

      const dayDate = this.parseISOToLocalDate(day);
      const start = this.setTimeOnDate(dayDate, Math.floor(startMinutes / 60), startMinutes % 60);
      let end;

      if (endMinutes === 1440) {
        const nextDay = new Date(dayDate);
        nextDay.setDate(nextDay.getDate() + 1);
        end = this.setTimeOnDate(nextDay, 0, 0);
      } else {
        end = this.setTimeOnDate(dayDate, Math.floor(endMinutes / 60), endMinutes % 60);
      }

      if (end <= start) {
        end = new Date(start.getTime() + 10 * 60 * 1000);
      }

      imported.push({
        start: start.toISOString(),
        end: end.toISOString(),
        day,
        project: this.asTrimmedString(rawProject),
        activityLabel: this.asTrimmedString(rawActivity),
        activityId: this.asTrimmedString(rawActivityId),
        artiaLaunched: this.parseArtiaLaunchValue(rawArtiaLaunched),
        notes: this.asTrimmedString(rawNotes)
      });
    }

    return imported;
  }

  parseArtiaLaunchValue(value) {
    const normalized = this.normalizeKey(value);
    return ['sim', 'yes', 'true', '1', 'x', 'ok'].includes(normalized);
  }

  parseAnyDateToISO(value) {
    if (value instanceof Date) {
      return this.formatDateISO(value);
    }

    if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 90000) {
      return this.formatDateISO(this.excelSerialToLocalDate(value));
    }

    const stringValue = this.asTrimmedString(value);

    if (!stringValue) {
      return '';
    }

    const brDateMatch = stringValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brDateMatch) {
      const day = String(brDateMatch[1]).padStart(2, '0');
      const month = String(brDateMatch[2]).padStart(2, '0');
      const year = brDateMatch[3];
      return `${year}-${month}-${day}`;
    }

    const isoDateMatch = stringValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoDateMatch) {
      const year = isoDateMatch[1];
      const month = String(isoDateMatch[2]).padStart(2, '0');
      const day = String(isoDateMatch[3]).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const numericValue = Number(stringValue.replace(',', '.'));
    if (Number.isFinite(numericValue) && numericValue > 20000 && numericValue < 90000) {
      return this.formatDateISO(this.excelSerialToLocalDate(numericValue));
    }

    return '';
  }

  parseAnyTimeToMinutes(value) {
    if (value instanceof Date) {
      return Math.max(0, Math.min(1440, value.getHours() * 60 + value.getMinutes()));
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value >= 0 && value <= 1) {
        return Math.max(0, Math.min(1440, Math.round(value * 24 * 60)));
      }

      if (value >= 0 && value <= 1440) {
        return Math.round(value);
      }
    }

    const stringValue = this.asTrimmedString(value);

    if (!stringValue) {
      return null;
    }

    if (stringValue === '24:00' || stringValue === '24:0' || stringValue === '24') {
      return 1440;
    }

    const timeMatch = stringValue.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);

      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
      }

      return Math.max(0, Math.min(1440, hours * 60 + minutes));
    }

    const numericValue = Number(stringValue.replace(',', '.'));

    if (!Number.isFinite(numericValue)) {
      return null;
    }

    if (numericValue >= 0 && numericValue <= 1) {
      return Math.max(0, Math.min(1440, Math.round(numericValue * 24 * 60)));
    }

    if (numericValue >= 0 && numericValue <= 1440) {
      return Math.round(numericValue);
    }

    return null;
  }

  excelSerialToLocalDate(serial) {
    const base = new Date(1899, 11, 30);
    const milliseconds = Math.round(serial * 86400000);
    return new Date(base.getTime() + milliseconds);
  }

  formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  parseISOToLocalDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  setTimeOnDate(date, hours, minutes) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      0,
      0
    );
  }

  getByCol(row, column) {
    if (!column) {
      return '';
    }

    return row[column] ?? '';
  }

  isEmptyValue(value) {
    if (value instanceof Date) {
      return false;
    }

    return this.asTrimmedString(value) === '';
  }

  asTrimmedString(value) {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value).trim();
  }

  normalizeKey(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[–—]/g, '-')
      .replace(/\s*-\s*/g, ' - ')
      .replace(/\u00A0/g, ' ');
  }

  columnToLetter(columnNumber) {
    let number = columnNumber;
    let result = '';

    while (number > 0) {
      const modulo = (number - 1) % 26;
      result = String.fromCharCode(65 + modulo) + result;
      number = Math.floor((number - modulo) / 26);
    }

    return result;
  }
}
