export class IEventRepository {
  async create(event) {
    throw new Error('Method not implemented');
  }

  async bulkCreate(events) {
    throw new Error('Method not implemented');
  }

  async findById(id, userId) {
    throw new Error('Method not implemented');
  }

  async findAll(filters = {}) {
    throw new Error('Method not implemented');
  }

  async findByDateRange(startDate, endDate, userId) {
    throw new Error('Method not implemented');
  }

  async findByDay(day, userId) {
    throw new Error('Method not implemented');
  }

  async update(id, event, userId) {
    throw new Error('Method not implemented');
  }

  async delete(id, userId) {
    throw new Error('Method not implemented');
  }

  async deleteAllByUser(userId) {
    throw new Error('Method not implemented');
  }

  async findByProject(projectNumber, userId) {
    throw new Error('Method not implemented');
  }
}
