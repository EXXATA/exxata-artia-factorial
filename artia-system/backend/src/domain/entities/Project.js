export class Project {
  constructor({
    id,
    number,
    name,
    activities = []
  }) {
    this.id = id;
    this.number = number;
    this.name = name;
    this.activities = activities;

    this.validate();
  }

  validate() {
    if (!this.id) {
      throw new Error('Project ID is required');
    }
    if (!this.number) {
      throw new Error('Project number is required');
    }
    if (!this.name) {
      throw new Error('Project name is required');
    }
  }

  addActivity(activity) {
    const exists = this.activities.some(a => a.id === activity.id);
    if (exists) {
      throw new Error('Activity already exists in this project');
    }
    this.activities.push(activity);
  }

  removeActivity(activityId) {
    this.activities = this.activities.filter(a => a.id !== activityId);
  }

  getActivity(activityId) {
    return this.activities.find(a => a.id === activityId);
  }

  hasActivity(activityId) {
    return this.activities.some(a => a.id === activityId);
  }

  toJSON() {
    return {
      id: this.id,
      number: this.number,
      name: this.name,
      activities: this.activities.map(a => a.toJSON())
    };
  }
}
