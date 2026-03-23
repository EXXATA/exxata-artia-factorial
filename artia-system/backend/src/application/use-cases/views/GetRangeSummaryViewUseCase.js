export class GetRangeSummaryViewUseCase {
  constructor(userReadProjectionService) {
    this.userReadProjectionService = userReadProjectionService;
  }

  async execute(userId, options = {}) {
    return this.userReadProjectionService.getRangeSummary(userId, options);
  }
}
