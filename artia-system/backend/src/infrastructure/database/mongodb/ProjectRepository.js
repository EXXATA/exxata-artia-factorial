import mongoose from 'mongoose';
import { Project } from '../../../domain/entities/Project.js';
import { Activity } from '../../../domain/entities/Activity.js';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository.js';

const activitySchema = new mongoose.Schema({
  activityId: { type: String, required: true },
  label: { type: String, required: true },
  artiaId: { type: String }
});

const projectSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  number: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  activities: [activitySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

projectSchema.index({ name: 'text', number: 'text' });

const ProjectModel = mongoose.model('Project', projectSchema);

export class ProjectRepository extends IProjectRepository {
  async create(project) {
    const projectDoc = new ProjectModel({
      projectId: project.id,
      number: project.number,
      name: project.name,
      activities: project.activities.map(a => ({
        activityId: a.id,
        label: a.label,
        artiaId: a.artiaId
      }))
    });

    await projectDoc.save();
    return this.toDomain(projectDoc);
  }

  async findById(id) {
    const projectDoc = await ProjectModel.findOne({ projectId: id });
    return projectDoc ? this.toDomain(projectDoc) : null;
  }

  async findByNumber(number) {
    const projectDoc = await ProjectModel.findOne({ number });
    return projectDoc ? this.toDomain(projectDoc) : null;
  }

  async findAll(filters = {}) {
    const projectDocs = await ProjectModel.find().sort({ number: 1 });
    return projectDocs.map(doc => this.toDomain(doc));
  }

  async search(searchTerm) {
    const projectDocs = await ProjectModel.find({
      $or: [
        { number: { $regex: searchTerm, $options: 'i' } },
        { name: { $regex: searchTerm, $options: 'i' } }
      ]
    }).sort({ number: 1 });

    return projectDocs.map(doc => this.toDomain(doc));
  }

  async update(id, project) {
    const projectDoc = await ProjectModel.findOneAndUpdate(
      { projectId: id },
      {
        number: project.number,
        name: project.name,
        activities: project.activities.map(a => ({
          activityId: a.id,
          label: a.label,
          artiaId: a.artiaId
        })),
        updatedAt: new Date()
      },
      { new: true }
    );

    return projectDoc ? this.toDomain(projectDoc) : null;
  }

  async delete(id) {
    await ProjectModel.deleteOne({ projectId: id });
    return true;
  }

  async bulkCreate(projects) {
    const operations = projects.map(project => ({
      updateOne: {
        filter: { number: project.number },
        update: {
          $set: {
            projectId: project.id,
            number: project.number,
            name: project.name,
            activities: project.activities.map(a => ({
              activityId: a.id,
              label: a.label,
              artiaId: a.artiaId
            })),
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        upsert: true
      }
    }));

    await ProjectModel.bulkWrite(operations);
    return projects;
  }

  toDomain(projectDoc) {
    const activities = projectDoc.activities.map(a => new Activity({
      id: a.activityId,
      label: a.label,
      artiaId: a.artiaId,
      projectId: projectDoc.projectId
    }));

    return new Project({
      id: projectDoc.projectId,
      number: projectDoc.number,
      name: projectDoc.name,
      activities
    });
  }
}
