export class ExportController {
  constructor(exportToCSVUseCase, exportToXLSXUseCase) {
    this.exportToCSVUseCase = exportToCSVUseCase;
    this.exportToXLSXUseCase = exportToXLSXUseCase;
  }

  async exportCSV(req, res, next) {
    try {
      const userId = req.user.id;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        project: req.query.project
      };
      const email = req.query.email || '';

      const result = await this.exportToCSVUseCase.execute(filters, email, userId);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      next(error);
    }
  }

  async exportXLSX(req, res, next) {
    try {
      const userId = req.user.id;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        project: req.query.project,
        baseFileName: req.query.baseFileName
      };

      const result = await this.exportToXLSXUseCase.execute(filters, userId);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      next(error);
    }
  }
}
