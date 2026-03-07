export class SearchProjectsUseCase {
  constructor(projectRepository) {
    this.projectRepository = projectRepository;
  }

  async execute(searchTerm) {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return await this.projectRepository.findAll();
    }

    const projects = await this.projectRepository.search(searchTerm);

    return projects.map(project => project.toJSON());
  }
}
