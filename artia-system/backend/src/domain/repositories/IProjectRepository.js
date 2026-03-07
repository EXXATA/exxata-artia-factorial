export class IProjectRepository {
  async create(project) {
    throw new Error('Method not implemented');
  }

  async findById(id) {
    throw new Error('Method not implemented');
  }

  async findByNumber(number) {
    throw new Error('Method not implemented');
  }

  async findAll(filters = {}) {
    throw new Error('Method not implemented');
  }

  async search(searchTerm) {
    throw new Error('Method not implemented');
  }

  async update(id, project) {
    throw new Error('Method not implemented');
  }

  async delete(id) {
    throw new Error('Method not implemented');
  }

  async bulkCreate(projects) {
    throw new Error('Method not implemented');
  }
}
