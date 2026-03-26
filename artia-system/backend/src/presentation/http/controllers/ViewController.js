export class ViewController {
  constructor(getWeekViewUseCase, getRangeSummaryViewUseCase) {
    this.getWeekViewUseCase = getWeekViewUseCase;
    this.getRangeSummaryViewUseCase = getRangeSummaryViewUseCase;
  }

  resolveForceRefresh(query) {
    return query?.refresh === true || query?.refresh === 'true' || query?.refresh === '1';
  }

  async getWeek(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const { startDate, endDate, projectKey, activityKey } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Data inicial e final são obrigatórias (formato: YYYY-MM-DD)'
        });
      }

      const result = await this.getWeekViewUseCase.execute(userId, {
        startDate,
        endDate,
        projectKey,
        activityKey,
        forceRefresh: this.resolveForceRefresh(req.query)
      });

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getRangeSummary(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const { startDate, endDate, projectKey, activityKey } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Data inicial e final são obrigatórias (formato: YYYY-MM-DD)'
        });
      }

      const result = await this.getRangeSummaryViewUseCase.execute(userId, {
        startDate,
        endDate,
        projectKey,
        activityKey,
        forceRefresh: this.resolveForceRefresh(req.query)
      });

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
