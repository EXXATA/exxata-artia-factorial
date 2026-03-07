export class Activity {
  constructor({
    id,
    label,
    artiaId = null,
    projectId
  }) {
    this.id = id;
    this.label = label;
    this.artiaId = artiaId;
    this.projectId = projectId;

    this.validate();
  }

  validate() {
    if (!this.id) {
      throw new Error('Activity ID is required');
    }
    if (!this.label) {
      throw new Error('Activity label is required');
    }
    if (!this.projectId) {
      throw new Error('Project ID is required');
    }
  }

  updateArtiaId(artiaId) {
    this.artiaId = artiaId;
  }

  toJSON() {
    return {
      id: this.id,
      label: this.label,
      artiaId: this.artiaId,
      projectId: this.projectId
    };
  }
}
