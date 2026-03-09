export class WorkedHoursController {
  constructor(getWorkedHoursComparisonUseCase) {
    this.getWorkedHoursComparisonUseCase = getWorkedHoursComparisonUseCase;
  }

  resolveForceRefresh(query) {
    return query?.refresh === true || query?.refresh === 'true';
  }

  async getRangeComparison(req, res, next) {
    try {
      const userId = req.user.userId;
      const { startDate, endDate, project, activity } = req.query;
      const forceRefresh = this.resolveForceRefresh(req.query);

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Data inicial e final são obrigatórias (formato: YYYY-MM-DD)'
        });
      }

      const result = await this.getWorkedHoursComparisonUseCase.execute(userId, {
        startDate,
        endDate,
        project,
        activity,
        forceRefresh
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getDailyComparison(req, res, next) {
    try {
      const userId = req.user.userId;
      const { date, project, activity } = req.query;
      const forceRefresh = this.resolveForceRefresh(req.query);

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Data é obrigatória (formato: YYYY-MM-DD)'
        });
      }

      const result = await this.getWorkedHoursComparisonUseCase.execute(userId, {
        date: new Date(date),
        project,
        activity,
        forceRefresh
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyComparison(req, res, next) {
    try {
      const userId = req.user.userId;
      const { year, month, project, activity } = req.query;
      const forceRefresh = this.resolveForceRefresh(req.query);

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Ano e mês são obrigatórios'
        });
      }

      const result = await this.getWorkedHoursComparisonUseCase.execute(userId, {
        year: parseInt(year),
        month: parseInt(month),
        project,
        activity,
        forceRefresh
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getFullHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const { project, activity } = req.query;
      const forceRefresh = this.resolveForceRefresh(req.query);

      const result = await this.getWorkedHoursComparisonUseCase.execute(userId, {
        project,
        activity,
        forceRefresh
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
