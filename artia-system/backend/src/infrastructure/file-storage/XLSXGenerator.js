const textEncoder = new TextEncoder();

export class XLSXGenerator {
  async generate(events, options = {}) {
    const { rowsEvents, meta } = this.buildBackupRows(events, options.baseFileName || '');
    const headersEvents = ['Data', 'Projeto', 'Hora Início', 'Hora de Término', 'Esforço', 'Atividade', 'Observação', 'Lançamento Artia', 'ID'];
    const headersMeta = ['Gerado em', 'Atividades', 'Arquivo Base'];

    const sheet1 = this.sheetXmlFromTable(headersEvents, rowsEvents);
    const sheet2 = this.sheetXmlFromTable(headersMeta, meta);

    const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
      + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheets>'
      + '<sheet name="atividades" sheetId="1" r:id="rId1"/>'
      + '<sheet name="Meta" sheetId="2" r:id="rId2"/>'
      + '</sheets></workbook>';

    const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>'
      + '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '</Relationships>';

    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>'
      + '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
      + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
      + '</styleSheet>';

    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '</Types>';

    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>';

    const bytes = this.zipStore([
      { name: '[Content_Types].xml', data: this.encodeUtf8(contentTypes) },
      { name: '_rels/.rels', data: this.encodeUtf8(rels) },
      { name: 'xl/workbook.xml', data: this.encodeUtf8(workbook) },
      { name: 'xl/_rels/workbook.xml.rels', data: this.encodeUtf8(workbookRels) },
      { name: 'xl/styles.xml', data: this.encodeUtf8(styles) },
      { name: 'xl/worksheets/sheet1.xml', data: this.encodeUtf8(sheet1) },
      { name: 'xl/worksheets/sheet2.xml', data: this.encodeUtf8(sheet2) }
    ]);

    return Buffer.from(bytes);
  }

  buildBackupRows(events, baseFileName) {
    const rowsEvents = events
      .slice()
      .sort((left, right) => String(left.timeRange.start.toISOString()).localeCompare(String(right.timeRange.start.toISOString())))
      .map(event => {
        const start = event.timeRange.start;
        const end = event.timeRange.end;
        const effort = (start && end) ? this.durationMinutes(start, end) / 60 : '';

        return {
          Data: event.timeRange.day || this.formatDateISO(start || new Date()),
          Projeto: event.project || '',
          'Hora Início': this.getStartHHMM(event),
          'Hora de Término': this.getEndHHMM(event),
          Esforço: effort === '' ? '' : Number(effort.toFixed(2)),
          Atividade: event.activity.label || '',
          Observação: event.notes || '',
          'Lançamento Artia': event.artiaLaunched ? 'Sim' : 'Não',
          ID: event.activity.id || ''
        };
      });

    const meta = [{
      'Gerado em': new Date().toISOString(),
      Eventos: rowsEvents.length,
      'Arquivo Base': baseFileName || ''
    }];

    return { rowsEvents, meta };
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

  durationMinutes(start, end) {
    return (end.getTime() - start.getTime()) / 60000;
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

  sheetXmlFromTable(headers, rows) {
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
      + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheetData>';

    xml += '<row r="1">';
    for (let index = 0; index < headers.length; index += 1) {
      xml += this.cellXml(1, index + 1, headers[index]);
    }
    xml += '</row>';

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const rowNumber = rowIndex + 2;
      xml += `<row r="${rowNumber}">`;

      for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
        const header = headers[columnIndex];
        xml += this.cellXml(rowNumber, columnIndex + 1, rows[rowIndex]?.[header] ?? '');
      }

      xml += '</row>';
    }

    xml += '</sheetData></worksheet>';
    return xml;
  }

  cellXml(row, column, value) {
    const reference = `${this.columnName(column)}${String(row)}`;

    if (value === null || value === undefined || value === '') {
      return `<c r="${reference}"/>`;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return `<c r="${reference}"><v>${String(value)}</v></c>`;
    }

    return `<c r="${reference}" t="inlineStr"><is><t>${this.xmlEscape(value)}</t></is></c>`;
  }

  columnName(columnNumber) {
    let number = columnNumber;
    let result = '';

    while (number > 0) {
      const modulo = (number - 1) % 26;
      result = String.fromCharCode(65 + modulo) + result;
      number = Math.floor((number - 1) / 26);
    }

    return result;
  }

  xmlEscape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  encodeUtf8(content) {
    return textEncoder.encode(content);
  }

  zipStore(entries) {
    const fileParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
      const data = entry.data;
      const nameBytes = this.encodeUtf8(entry.name);
      const crc = this.crc32(data);
      const compSize = data.length;
      const uncompSize = data.length;

      const localHeader = [
        this.u32(0x04034b50),
        this.u16(20),
        this.u16(0),
        this.u16(0),
        this.u16(0),
        this.u16(0),
        this.u32(crc),
        this.u32(compSize),
        this.u32(uncompSize),
        this.u16(nameBytes.length),
        this.u16(0)
      ];

      fileParts.push(...localHeader, nameBytes, data);

      const centralDirectory = [
        this.u32(0x02014b50),
        this.u16(20),
        this.u16(20),
        this.u16(0),
        this.u16(0),
        this.u16(0),
        this.u16(0),
        this.u32(crc),
        this.u32(compSize),
        this.u32(uncompSize),
        this.u16(nameBytes.length),
        this.u16(0),
        this.u16(0),
        this.u16(0),
        this.u16(0),
        this.u32(0),
        this.u32(offset)
      ];

      centralParts.push(...centralDirectory, nameBytes);
      offset += 30 + nameBytes.length + data.length;
    }

    const centralStart = offset;
    const centralLength = centralParts.reduce((sum, part) => sum + part.length, 0);
    const eocd = [
      this.u32(0x06054b50),
      this.u16(0),
      this.u16(0),
      this.u16(entries.length),
      this.u16(entries.length),
      this.u32(centralLength),
      this.u32(centralStart),
      this.u16(0)
    ];

    const allParts = [...fileParts, ...centralParts, ...eocd];
    const totalLength = allParts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(totalLength);
    let pointer = 0;

    for (const part of allParts) {
      output.set(part, pointer);
      pointer += part.length;
    }

    return output;
  }

  u16(value) {
    return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
  }

  u32(value) {
    return Uint8Array.of(
      value & 0xff,
      (value >>> 8) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 24) & 0xff
    );
  }

  crc32(data) {
    if (!this.crcTable) {
      this.crcTable = new Uint32Array(256);

      for (let index = 0; index < 256; index += 1) {
        let crc = index;

        for (let bit = 0; bit < 8; bit += 1) {
          crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
        }

        this.crcTable[index] = crc >>> 0;
      }
    }

    let crc = 0xffffffff;

    for (let index = 0; index < data.length; index += 1) {
      crc = this.crcTable[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
  }
}
