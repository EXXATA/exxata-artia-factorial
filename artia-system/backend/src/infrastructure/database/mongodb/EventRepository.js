import mongoose from 'mongoose';
import { Event } from '../../../domain/entities/Event.js';
import { TimeRange } from '../../../domain/value-objects/TimeRange.js';
import { IEventRepository } from '../../../domain/repositories/IEventRepository.js';

const eventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  day: { type: String, required: true, index: true },
  project: { type: String, required: true, index: true },
  activityId: { type: String },
  activityLabel: { type: String, required: true },
  notes: { type: String, default: '' },
  artiaLaunched: { type: Boolean, default: false },
  workplace: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

eventSchema.index({ userId: 1, day: 1 });
eventSchema.index({ userId: 1, project: 1 });

const EventModel = mongoose.model('Event', eventSchema);

export class EventRepository extends IEventRepository {
  async create(event) {
    const eventDoc = new EventModel({
      eventId: event.id,
      userId: event.userId,
      start: event.timeRange.start,
      end: event.timeRange.end,
      day: event.timeRange.day,
      project: event.project,
      activityId: event.activity.id,
      activityLabel: event.activity.label,
      notes: event.notes,
      artiaLaunched: event.artiaLaunched,
      workplace: event.workplace,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    });

    await eventDoc.save();
    return this.toDomain(eventDoc);
  }

  async bulkCreate(events) {
    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }

    const eventDocs = await EventModel.insertMany(events.map(event => ({
      eventId: event.id,
      userId: event.userId,
      start: event.timeRange.start,
      end: event.timeRange.end,
      day: event.timeRange.day,
      project: event.project,
      activityId: event.activity.id,
      activityLabel: event.activity.label,
      notes: event.notes,
      artiaLaunched: event.artiaLaunched,
      workplace: event.workplace,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    })));

    return eventDocs.map(doc => this.toDomain(doc));
  }

  async findById(id, userId) {
    const query = { eventId: id };

    if (userId) {
      query.userId = userId;
    }

    const eventDoc = await EventModel.findOne(query);
    return eventDoc ? this.toDomain(eventDoc) : null;
  }

  async findAll(filters = {}) {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    
    const eventDocs = await EventModel.find(query).sort({ start: 1 });
    return eventDocs.map(doc => this.toDomain(doc));
  }

  async findByDateRange(startDate, endDate, userId) {
    const eventDocs = await EventModel.find({
      userId,
      day: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ start: 1 });

    return eventDocs.map(doc => this.toDomain(doc));
  }

  async findByDay(day, userId) {
    const eventDocs = await EventModel.find({ userId, day }).sort({ start: 1 });
    return eventDocs.map(doc => this.toDomain(doc));
  }

  async update(id, event, userId) {
    const eventDoc = await EventModel.findOneAndUpdate(
      userId ? { eventId: id, userId } : { eventId: id },
      {
        start: event.timeRange.start,
        end: event.timeRange.end,
        day: event.timeRange.day,
        project: event.project,
        activityId: event.activity.id,
        activityLabel: event.activity.label,
        notes: event.notes,
        artiaLaunched: event.artiaLaunched,
        workplace: event.workplace,
        updatedAt: new Date()
      },
      { new: true }
    );

    return eventDoc ? this.toDomain(eventDoc) : null;
  }

  async delete(id, userId) {
    await EventModel.deleteOne(userId ? { eventId: id, userId } : { eventId: id });
    return true;
  }

  async deleteAllByUser(userId) {
    const result = await EventModel.deleteMany({ userId });
    return result.deletedCount || 0;
  }

  async findByProject(projectNumber, userId) {
    const eventDocs = await EventModel.find({ userId, project: projectNumber }).sort({ start: 1 });
    return eventDocs.map(doc => this.toDomain(doc));
  }

  toDomain(eventDoc) {
    const timeRange = new TimeRange(
      new Date(eventDoc.start),
      new Date(eventDoc.end),
      eventDoc.day
    );

    return new Event({
      id: eventDoc.eventId,
      userId: eventDoc.userId,
      timeRange,
      project: eventDoc.project,
      activity: {
        id: eventDoc.activityId,
        label: eventDoc.activityLabel
      },
      notes: eventDoc.notes,
      artiaLaunched: eventDoc.artiaLaunched,
      workplace: eventDoc.workplace,
      createdAt: eventDoc.createdAt,
      updatedAt: eventDoc.updatedAt
    });
  }
}
