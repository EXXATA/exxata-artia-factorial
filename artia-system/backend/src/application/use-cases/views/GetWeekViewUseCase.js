export class GetWeekViewUseCase {
  constructor(userReadProjectionService) {
    this.userReadProjectionService = userReadProjectionService;
  }

  async execute(userId, options = {}) {
    return this.userReadProjectionService.getWeekView(userId, options);
  }
}
