import { supabase } from './supabaseClient.js';
import { Event } from '../../../domain/entities/Event.js';
import { TimeRange } from '../../../domain/value-objects/TimeRange.js';
import { IEventRepository } from '../../../domain/repositories/IEventRepository.js';

export class EventRepository extends IEventRepository {
  async create(event) {
    const { data, error } = await supabase
      .from('events')
      .insert({
        event_id: event.id,
        user_id: event.userId,
        start_time: event.timeRange.start.toISOString(),
        end_time: event.timeRange.end.toISOString(),
        day: event.timeRange.day,
        project: event.project,
        activity_id: event.activity.id,
        activity_label: event.activity.label,
        notes: event.notes,
        artia_launched: event.artiaLaunched,
        workplace: event.workplace,
        created_at: event.createdAt.toISOString(),
        updated_at: event.updatedAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return this.toDomain(data);
  }

  async bulkCreate(events) {
    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('events')
      .insert(events.map(event => ({
        event_id: event.id,
        user_id: event.userId,
        start_time: event.timeRange.start.toISOString(),
        end_time: event.timeRange.end.toISOString(),
        day: event.timeRange.day,
        project: event.project,
        activity_id: event.activity.id,
        activity_label: event.activity.label,
        notes: event.notes,
        artia_launched: event.artiaLaunched,
        workplace: event.workplace,
        created_at: event.createdAt.toISOString(),
        updated_at: event.updatedAt.toISOString()
      })))
      .select();

    if (error) throw error;
    return data.map(row => this.toDomain(row));
  }

  async findById(id, userId) {
    let query = supabase
      .from('events')
      .select('*')
      .eq('event_id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.toDomain(data) : null;
  }

  async findAll(filters = {}) {
    let query = supabase.from('events').select('*');

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(row => this.toDomain(row));
  }

  async findByDateRange(startDate, endDate, userId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('day', startDate)
      .lte('day', endDate)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(row => this.toDomain(row));
  }

  async findByDay(day, userId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .eq('day', day)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(row => this.toDomain(row));
  }

  async update(id, event, userId) {
    let query = supabase
      .from('events')
      .update({
        start_time: event.timeRange.start.toISOString(),
        end_time: event.timeRange.end.toISOString(),
        day: event.timeRange.day,
        project: event.project,
        activity_id: event.activity.id,
        activity_label: event.activity.label,
        notes: event.notes,
        artia_launched: event.artiaLaunched,
        workplace: event.workplace,
        updated_at: new Date().toISOString()
      })
      .eq('event_id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.toDomain(data) : null;
  }

  async delete(id, userId) {
    let query = supabase
      .from('events')
      .delete()
      .eq('event_id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;
    if (error) throw error;
    return true;
  }

  async deleteAllByUser(userId) {
    const { error, count } = await supabase
      .from('events')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (error) throw error;
    return count || 0;
  }

  async findByProject(projectNumber, userId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .eq('project', projectNumber)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(row => this.toDomain(row));
  }

  toDomain(row) {
    const timeRange = new TimeRange(
      new Date(row.start_time),
      new Date(row.end_time),
      row.day
    );

    return new Event({
      id: row.event_id,
      userId: row.user_id,
      timeRange,
      project: row.project,
      activity: {
        id: row.activity_id,
        label: row.activity_label
      },
      notes: row.notes,
      artiaLaunched: row.artia_launched,
      workplace: row.workplace,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}
