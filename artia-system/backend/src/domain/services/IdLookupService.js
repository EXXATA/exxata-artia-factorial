export class IdLookupService {
  constructor(projectRepository) {
    this.projectRepository = projectRepository;
  }

  async lookupArtiaId(projectNumber, activityLabel) {
    if (!projectNumber || !activityLabel) {
      return null;
    }

    try {
      const project = await this.projectRepository.findByNumber(projectNumber);
      
      if (!project) {
        return null;
      }

      const normalizedLabel = this.normalizeActivityLabel(activityLabel);
      
      const activity = project.activities.find(a => 
        this.normalizeActivityLabel(a.label) === normalizedLabel
      );

      return activity ? activity.artiaId : null;
    } catch (error) {
      console.error('Error looking up Artia ID:', error);
      return null;
    }
  }

  normalizeActivityLabel(label) {
    return String(label || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[–—]/g, '-')
      .replace(/\s*-\s*/g, ' - ')
      .replace(/\u00A0/g, ' ');
  }

  async searchActivities(projectNumber, searchTerm) {
    if (!projectNumber || !searchTerm) {
      return [];
    }

    try {
      const project = await this.projectRepository.findByNumber(projectNumber);
      
      if (!project) {
        return [];
      }

      const normalizedSearch = this.normalizeActivityLabel(searchTerm);
      
      return project.activities.filter(activity => {
        const normalizedLabel = this.normalizeActivityLabel(activity.label);
        return normalizedLabel.includes(normalizedSearch);
      });
    } catch (error) {
      console.error('Error searching activities:', error);
      return [];
    }
  }
}
