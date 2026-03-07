import ExcelJS from 'exceljs';

export class XLSXParser {
  async parseProjectsFile(fileBuffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.worksheets[0];
    const data = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const projectCell = row.getCell(3).value;
      const activityCell = row.getCell(2).value;
      const idCell = row.getCell(1).value;

      const projectNumber = this.extractProjectNumber(projectCell);
      const projectName = this.extractProjectName(projectCell);
      const activityLabel = String(activityCell || '').trim();
      const artiaId = String(idCell || '').trim();

      if (projectNumber && activityLabel) {
        data.push({
          projectNumber,
          projectName,
          activityLabel,
          artiaId
        });
      }
    });

    return data;
  }

  extractProjectNumber(cellValue) {
    const s = String(cellValue ?? '').trim();
    const match = s.match(/\b(\d{3,})\b/);
    return match ? match[1] : '';
  }

  extractProjectName(cellValue) {
    const s = String(cellValue ?? '').trim();
    return s.replace(/^\d+\s*-?\s*/, '').trim();
  }
}
