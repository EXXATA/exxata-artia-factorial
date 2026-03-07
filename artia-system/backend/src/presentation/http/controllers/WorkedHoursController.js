export class WorkedHoursController {
  constructor(getWorkedHoursComparisonUseCase) {
    this.getWorkedHoursComparisonUseCase = getWorkedHoursComparisonUseCase;
  }

  async getDailyComparison(req, res, next) {
    try {
      const userId = req.user.userId;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Data é obrigatória (formato: YYYY-MM-DD)'
        });
      }

      const result = await this.getWorkedHoursComparisonUseCase.execute(userId, {
        date: new Date(date)
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
      const { year, month } = req.query;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Ano e mês são obrigatórios'
        });
      }

      const result = await this.getWorkedHoursComparisonUseCase.execute(userId, {
        year: parseInt(year),
        month: parseInt(month)
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

      const result = await this.getWorkedHoursComparisonUseCase.execute(userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
