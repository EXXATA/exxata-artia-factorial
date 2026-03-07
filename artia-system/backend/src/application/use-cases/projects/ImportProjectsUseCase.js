import { Project } from '../../../domain/entities/Project.js';
import { Activity } from '../../../domain/entities/Activity.js';

export class ImportProjectsUseCase {
  constructor(projectRepository, xlsxParser) {
    this.projectRepository = projectRepository;
    this.xlsxParser = xlsxParser;
  }

  async execute(fileBuffer) {
    const parsedData = await this.xlsxParser.parseProjectsFile(fileBuffer);

    const projects = this.mapToProjects(parsedData);

    await this.projectRepository.bulkCreate(projects);

    return {
      success: true,
      imported: projects.length,
      projects: projects.map(p => p.toJSON())
    };
  }

  mapToProjects(parsedData) {
    const projectsMap = new Map();

    parsedData.forEach(row => {
      const projectNumber = row.projectNumber;
      const projectName = row.projectName;
      const activityLabel = row.activityLabel;
      const artiaId = row.artiaId;

      if (!projectsMap.has(projectNumber)) {
        const project = new Project({
          id: this.generateProjectId(projectNumber),
          number: projectNumber,
          name: projectName,
          activities: []
        });
        projectsMap.set(projectNumber, project);
      }

      const project = projectsMap.get(projectNumber);
      
      if (activityLabel) {
        const activity = new Activity({
          id: this.generateActivityId(projectNumber, activityLabel),
          label: activityLabel,
          artiaId: artiaId || null,
          projectId: project.id
        });

        try {
          project.addActivity(activity);
        } catch (error) {
          console.warn(`Duplicate activity skipped: ${activityLabel} in project ${projectNumber}`);
        }
      }
    });

    return Array.from(projectsMap.values());
  }

  generateProjectId(projectNumber) {
    return `proj_${projectNumber}_${Date.now()}`;
  }

  generateActivityId(projectNumber, activityLabel) {
    const normalized = activityLabel.toLowerCase().replace(/\s+/g, '_');
    return `act_${projectNumber}_${normalized}_${Date.now()}`;
  }
}
