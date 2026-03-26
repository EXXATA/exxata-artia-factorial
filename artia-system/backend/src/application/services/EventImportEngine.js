import ExcelJS from 'exceljs';
import { LegacyEventsXLSXParser } from '../../infrastructure/file-storage/LegacyEventsXLSXParser.js';

const FIELD_CONFIG = {
  date: {
    label: 'Data',
    required: true,
    aliases: ['data', 'date', 'dia']
  },
  startTime: {
    label: 'Hora Início',
    required: true,
    aliases: ['hora inicio', 'hora início', 'inicio', 'início', 'start', 'hora de inicio', 'hora de início']
  },
  endTime: {
    label: 'Hora de Término',
    required: true,
    aliases: ['hora de termino', 'hora de término', 'termino', 'término', 'fim', 'end', 'hora fim']
  },
  project: {
    label: 'Projeto',
    required: true,
    aliases: ['projeto', 'project']
  },
  activity: {
    label: 'Atividade',
    required: true,
    aliases: ['atividade', 'activity', 'tarefa']
  },
  activityId: {
    label: 'ID da Atividade',
    required: false,
    aliases: ['id da atividade', 'id atividade', 'atividade id', 'id', 'activity id']
  },
  notes: {
    label: 'Observação',
    required: false,
    aliases: ['observacao', 'observação', 'nota', 'notas', 'notes', 'descricao', 'descrição']
  },
  artiaLaunched: {
    label: 'Lançamento Artia',
    required: false,
    aliases: ['lancamento artia', 'lançamento artia', 'artia', 'lançado artia', 'lancado artia']
  },
  workplace: {
    label: 'Local de trabalho',
    required: false,
    aliases: ['local de trabalho', 'workplace', 'local', 'regime']
  }
};

function buildIssue(severity, code, field, message) {
  return {
    severity,
    code,
    field,
    message
  };
}

function compareDates(left, right) {
  return new Date(left).getTime() - new Date(right).getTime();
}

export class EventImportEngine {
  constructor(legacyParser = new LegacyEventsXLSXParser()) {
    this.legacyParser = legacyParser;
  }

  async analyze({
    buffer,
    fileName = '',
    mapping = {},
    accessibleProjects = [],
    existingEvents = []
  }) {
    const source = await this.parseSource(buffer, fileName);
    const detectedColumns = this.buildDetectedColumns(source.headers, source.rows);
    const suggestedMapping = this.buildSuggestedMapping(detectedColumns, mapping);
    const normalizedExistingEvents = existingEvents.map((event) => this.normalizeExistingEvent(event));
    const previewRows = [];
    const importConflictCandidates = [];
    const importSignatures = new Set();

    source.rows.forEach((row, index) => {
      const rowNumber = source.firstDataRowNumber + index;
      const previewRow = this.buildPreviewRow({
        row,
        rowNumber,
        mapping: suggestedMapping,
        accessibleProjects,
        existingEvents: normalizedExistingEvents,
        importConflictCandidates,
        importSignatures
      });

      if (!previewRow) {
        return;
      }

      previewRows.push(previewRow);

      if (previewRow.status === 'valid' && previewRow.normalized) {
        importConflictCandidates.push(previewRow.normalized);
        importSignatures.add(this.buildSignature(previewRow.normalized));
      }
    });

    return {
      detectedColumns,
      suggestedMapping,
      previewRows,
      summary: {
        totalRows: previewRows.length,
        validRows: previewRows.filter((row) => row.status === 'valid').length,
        warningRows: previewRows.filter((row) => row.status === 'warning').length,
        criticalRows: previewRows.filter((row) => row.status === 'critical').length
      }
    };
  }

  async parseSource(buffer, fileName) {
    const normalizedName = String(fileName || '').toLowerCase();

    if (normalizedName.endsWith('.xlsx')) {
      return this.parseXlsx(buffer);
    }

    return this.parseCsv(buffer);
  }

  async parseXlsx(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets.find(
      (sheet) => this.legacyParser.normalizeKey(sheet.name) === 'atividades'
    ) || workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('Não encontrei nenhuma aba para importar.');
    }

    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (worksheetRow, rowNumber) => {
      const values = [];
      worksheetRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        values[columnNumber - 1] = this.legacyParser.normalizeCellValue(cell.value);
      });
      rows.push({ rowNumber, values });
    });

    return this.buildTabularSource(rows);
  }

  parseCsv(buffer) {
    const text = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : String(buffer || '');
    const delimiter = this.detectDelimiter(text);
    const rawLines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    const rows = rawLines
      .map((line, index) => ({
        rowNumber: index + 1,
        values: this.parseDelimitedLine(line, delimiter)
      }))
      .filter((row) => row.values.some((value) => this.legacyParser.asTrimmedString(value) !== ''));

    return this.buildTabularSource(rows);
  }

  buildTabularSource(rows) {
    if (!rows.length) {
      throw new Error('O arquivo parece vazio.');
    }

    const headerRow = rows[0];
    const headers = (headerRow.values || []).map((value, index) => ({
      index,
      columnName: this.legacyParser.asTrimmedString(value) || `Coluna ${index + 1}`
    }));

    const dataRows = rows.slice(1).map((row) => {
      const nextRow = {};
      headers.forEach((header, index) => {
        nextRow[header.columnName] = row.values[index] ?? '';
      });
      return nextRow;
    });

    return {
      headers,
      rows: dataRows,
      firstDataRowNumber: headerRow.rowNumber + 1
    };
  }

  buildDetectedColumns(headers, rows) {
    return headers.map((header) => ({
      index: header.index,
      columnName: header.columnName,
      normalizedName: this.legacyParser.normalizeKey(header.columnName),
      sampleValues: rows
        .slice(0, 3)
        .map((row) => this.legacyParser.asTrimmedString(row[header.columnName]))
        .filter(Boolean)
    }));
  }

  buildSuggestedMapping(detectedColumns, manualMapping = {}) {
    const manualEntries = typeof manualMapping === 'object' && manualMapping !== null
      ? manualMapping
      : {};

    return Object.entries(FIELD_CONFIG).reduce((accumulator, [field, config]) => {
      const manualColumnName = this.legacyParser.asTrimmedString(manualEntries[field]);
      if (manualColumnName) {
        accumulator[field] = {
          field,
          label: config.label,
          required: config.required,
          columnName: manualColumnName,
          confidence: 1,
          source: 'manual'
        };
        return accumulator;
      }

      const bestMatch = detectedColumns.reduce((best, column) => {
        const score = this.getColumnMatchScore(column.normalizedName, config.aliases);
        if (!best || score > best.score) {
          return {
            score,
            columnName: column.columnName
          };
        }

        return best;
      }, null);

      accumulator[field] = {
        field,
        label: config.label,
        required: config.required,
        columnName: bestMatch?.score > 0 ? bestMatch.columnName : '',
        confidence: bestMatch?.score || 0,
        source: bestMatch?.score > 0 ? 'suggested' : 'unmapped'
      };
      return accumulator;
    }, {});
  }

  getColumnMatchScore(normalizedColumnName, aliases = []) {
    return aliases.reduce((best, alias) => {
      const normalizedAlias = this.legacyParser.normalizeKey(alias);
      if (normalizedColumnName === normalizedAlias) {
        return Math.max(best, 1);
      }

      if (normalizedColumnName.includes(normalizedAlias) || normalizedAlias.includes(normalizedColumnName)) {
        return Math.max(best, 0.82);
      }

      const tokenOverlap = this.computeTokenOverlap(normalizedColumnName, normalizedAlias);
      return Math.max(best, tokenOverlap);
    }, 0);
  }

  computeTokenOverlap(left, right) {
    const leftTokens = new Set(left.split(' ').filter(Boolean));
    const rightTokens = new Set(right.split(' ').filter(Boolean));

    if (!leftTokens.size || !rightTokens.size) {
      return 0;
    }

    const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
    const denominator = Math.max(leftTokens.size, rightTokens.size);
    return overlap / denominator;
  }

  buildPreviewRow({
    row,
    rowNumber,
    mapping,
    accessibleProjects,
    existingEvents,
    importConflictCandidates,
    importSignatures
  }) {
    const sourceValues = Object.entries(mapping).reduce((accumulator, [field, config]) => {
      accumulator[field] = config.columnName ? row[config.columnName] ?? '' : '';
      return accumulator;
    }, {});

    const hasAnyValue = Object.values(sourceValues).some(
      (value) => this.legacyParser.asTrimmedString(value) !== ''
    );

    if (!hasAnyValue) {
      return null;
    }

    const issues = [];
    const day = this.legacyParser.parseAnyDateToISO(sourceValues.date);
    const startMinutes = this.legacyParser.parseAnyTimeToMinutes(sourceValues.startTime);
    const endMinutes = this.legacyParser.parseAnyTimeToMinutes(sourceValues.endTime);
    const projectInput = this.legacyParser.asTrimmedString(sourceValues.project);
    const activityLabelInput = this.legacyParser.asTrimmedString(sourceValues.activity);
    const activityIdInput = this.legacyParser.asTrimmedString(sourceValues.activityId);
    const notes = this.legacyParser.asTrimmedString(sourceValues.notes);
    const workplace = this.legacyParser.asTrimmedString(sourceValues.workplace) || null;
    const artiaLaunched = this.legacyParser.parseArtiaLaunchValue(sourceValues.artiaLaunched);

    Object.entries(FIELD_CONFIG).forEach(([field, config]) => {
      if (config.required && !mapping[field]?.columnName) {
        issues.push(buildIssue(
          'critical',
          'MISSING_MAPPING',
          field,
          `Mapeie a coluna de ${config.label} antes de continuar.`
        ));
      }
    });

    if (!day) {
      issues.push(buildIssue('critical', 'DATE_INVALID', 'date', 'Data inválida ou ausente.'));
    }

    if (startMinutes === null) {
      issues.push(buildIssue('critical', 'START_TIME_INVALID', 'startTime', 'Hora de início inválida ou ausente.'));
    }

    if (endMinutes === null) {
      issues.push(buildIssue('critical', 'END_TIME_INVALID', 'endTime', 'Hora de término inválida ou ausente.'));
    }

    if (!projectInput) {
      issues.push(buildIssue('critical', 'PROJECT_REQUIRED', 'project', 'Projeto obrigatório.'));
    }

    if (!activityLabelInput && !activityIdInput) {
      issues.push(buildIssue('critical', 'ACTIVITY_REQUIRED', 'activity', 'Atividade obrigatória.'));
    }

    let start = '';
    let end = '';
    if (day && startMinutes !== null && endMinutes !== null) {
      start = this.buildIsoDateFromMinutes(day, startMinutes);
      end = this.buildIsoDateFromMinutes(day, endMinutes, { allowDayEnd: true });

      if (!start || !end || new Date(end) <= new Date(start)) {
        issues.push(buildIssue('critical', 'END_BEFORE_START', 'endTime', 'Hora de término deve ser maior que a de início.'));
      }
    }

    const resolvedProject = projectInput
      ? this.findProject(accessibleProjects, projectInput)
      : null;

    if (projectInput && !resolvedProject) {
      issues.push(buildIssue(
        'critical',
        'PROJECT_NOT_ACCESSIBLE',
        'project',
        'Projeto fora do acesso atual do usuário no Artia.'
      ));
    }

    const resolvedActivity = resolvedProject
      ? this.findActivity(resolvedProject, {
        activityLabel: activityLabelInput,
        activityId: activityIdInput
      })
      : null;

    if (resolvedProject && !resolvedActivity) {
      issues.push(buildIssue(
        'critical',
        'ACTIVITY_INVALID',
        'activity',
        'Atividade fora do projeto selecionado ou indisponível no Artia.'
      ));
    }

    const normalized = issues.some((issue) => issue.severity === 'critical')
      ? null
      : {
        day,
        start,
        end,
        project: resolvedProject.number,
        activity: {
          id: String(resolvedActivity.artiaId || resolvedActivity.id || '').trim(),
          label: resolvedActivity.label
        },
        notes,
        artiaLaunched,
        workplace
      };

    if (normalized) {
      const signature = this.buildSignature(normalized);
      const hasExactDuplicate = existingEvents.some((event) => this.buildSignature(event) === signature)
        || importSignatures.has(signature);

      if (hasExactDuplicate) {
        issues.push(buildIssue(
          'warning',
          'DUPLICATE_EVENT',
          null,
          'Linha duplicada em relação a um apontamento já existente ou repetido na importação.'
        ));
      } else {
        const conflict = [...existingEvents, ...importConflictCandidates]
          .find((event) => this.eventsOverlap(event, normalized));

        if (conflict) {
          issues.push(buildIssue(
            'critical',
            'TIME_CONFLICT',
            null,
            'Linha em conflito de horário com outro apontamento do mesmo dia.'
          ));
        }
      }
    }

    return {
      rowId: `row-${rowNumber}`,
      rowNumber,
      sourceValues: Object.fromEntries(
        Object.entries(sourceValues).map(([field, value]) => [field, this.legacyParser.asTrimmedString(value)])
      ),
      normalized,
      issues,
      status: this.resolveStatus(issues)
    };
  }

  resolveStatus(issues) {
    if (issues.some((issue) => issue.severity === 'critical')) {
      return 'critical';
    }

    if (issues.some((issue) => issue.severity === 'warning')) {
      return 'warning';
    }

    return 'valid';
  }

  buildIsoDateFromMinutes(day, minutes, { allowDayEnd = false } = {}) {
    if (!day || typeof minutes !== 'number') {
      return '';
    }

    if (allowDayEnd && minutes === 1440) {
      const nextDay = new Date(`${day}T00:00:00`);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      return nextDay.toISOString();
    }

    const date = this.legacyParser.parseISOToLocalDate(day);
    const hours = Math.floor(minutes / 60);
    const remainderMinutes = minutes % 60;
    date.setHours(hours, remainderMinutes, 0, 0);
    return date.toISOString();
  }

  buildSignature(event) {
    return [
      event.day,
      event.start,
      event.end,
      event.project,
      event.activity?.id || event.activityId || '',
      event.artiaLaunched ? '1' : '0',
      event.notes || ''
    ].join('|');
  }

  eventsOverlap(left, right) {
    if (!left?.day || !right?.day || left.day !== right.day) {
      return false;
    }

    return new Date(left.start).getTime() < new Date(right.end).getTime()
      && new Date(right.start).getTime() < new Date(left.end).getTime();
  }

  normalizeExistingEvent(event) {
    return {
      day: event.day,
      start: event.start,
      end: event.end,
      project: event.project,
      activity: {
        id: event.activity?.id || event.activityId || '',
        label: event.activity?.label || event.activityLabel || ''
      },
      notes: event.notes || '',
      artiaLaunched: Boolean(event.artiaLaunched),
      workplace: event.workplace || null
    };
  }

  findProject(projects, projectIdentifier) {
    const normalizedIdentifier = this.normalizeProjectNumber(projectIdentifier);
    return (projects || []).find((project) => (
      this.normalizeProjectNumber(project.number) === normalizedIdentifier
      || this.legacyParser.normalizeKey(project.name).includes(this.legacyParser.normalizeKey(projectIdentifier))
    )) || null;
  }

  findActivity(project, { activityLabel, activityId }) {
    const normalizedLabel = this.legacyParser.normalizeKey(activityLabel);
    return (project?.activities || []).find((activity) => {
      const normalizedActivityId = String(activity.artiaId || activity.id || '').trim();
      if (activityId && normalizedActivityId === activityId) {
        return true;
      }

      if (activityLabel && this.legacyParser.normalizeKey(activity.label) === normalizedLabel) {
        return true;
      }

      return false;
    }) || null;
  }

  normalizeProjectNumber(value) {
    return String(value || '').split(' - ')[0].trim();
  }

  detectDelimiter(text) {
    const candidates = [';', ',', '\t'];
    const sample = text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .slice(0, 5)
      .join('\n');

    return candidates.reduce((best, delimiter) => {
      const score = this.countDelimiterOutsideQuotes(sample, delimiter);
      if (!best || score > best.score) {
        return { delimiter, score };
      }

      return best;
    }, null)?.delimiter || ';';
  }

  countDelimiterOutsideQuotes(text, delimiter) {
    let count = 0;
    let inQuotes = false;

    for (const character of text) {
      if (character === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && character === delimiter) {
        count += 1;
      }
    }

    return count;
  }

  parseDelimitedLine(line, delimiter) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      const nextCharacter = line[index + 1];

      if (character === '"' && nextCharacter === '"') {
        current += '"';
        index += 1;
        continue;
      }

      if (character === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (character === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += character;
    }

    values.push(current.trim());
    return values;
  }
}
