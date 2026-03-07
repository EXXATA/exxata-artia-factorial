import { supabase } from './supabaseClient.js';
import { Project } from '../../../domain/entities/Project.js';
import { Activity } from '../../../domain/entities/Activity.js';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository.js';

export class ProjectRepository extends IProjectRepository {
  async create(project) {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        project_id: project.id,
        number: project.number,
        name: project.name
      })
      .select()
      .single();

    if (projectError) throw projectError;

    if (project.activities.length > 0) {
      const { error: activitiesError } = await supabase
        .from('activities')
        .insert(project.activities.map(a => ({
          activity_id: a.id,
          project_id: project.id,
          label: a.label,
          artia_id: a.artiaId
        })));

      if (activitiesError) throw activitiesError;
    }

    return this.findById(project.id);
  }

  async findById(id) {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('project_id', id)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') return null;
      throw projectError;
    }

    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('project_id', id);

    if (activitiesError) throw activitiesError;

    return this.toDomain(projectData, activitiesData || []);
  }

  async findByNumber(number) {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('number', number)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') return null;
      throw projectError;
    }

    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('project_id', projectData.project_id);

    if (activitiesError) throw activitiesError;

    return this.toDomain(projectData, activitiesData || []);
  }

  async findAll(filters = {}) {
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('number', { ascending: true });

    if (projectsError) throw projectsError;

    const projectIds = projectsData.map(p => p.project_id);
    
    if (projectIds.length === 0) {
      return [];
    }

    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .in('project_id', projectIds);

    if (activitiesError) throw activitiesError;

    const activitiesByProject = (activitiesData || []).reduce((acc, activity) => {
      if (!acc[activity.project_id]) {
        acc[activity.project_id] = [];
      }
      acc[activity.project_id].push(activity);
      return acc;
    }, {});

    return projectsData.map(project => 
      this.toDomain(project, activitiesByProject[project.project_id] || [])
    );
  }

  async search(searchTerm) {
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .or(`number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      .order('number', { ascending: true });

    if (projectsError) throw projectsError;

    const projectIds = projectsData.map(p => p.project_id);
    
    if (projectIds.length === 0) {
      return [];
    }

    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .in('project_id', projectIds);

    if (activitiesError) throw activitiesError;

    const activitiesByProject = (activitiesData || []).reduce((acc, activity) => {
      if (!acc[activity.project_id]) {
        acc[activity.project_id] = [];
      }
      acc[activity.project_id].push(activity);
      return acc;
    }, {});

    return projectsData.map(project => 
      this.toDomain(project, activitiesByProject[project.project_id] || [])
    );
  }

  async update(id, project) {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .update({
        number: project.number,
        name: project.name,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', id)
      .select()
      .single();

    if (projectError) throw projectError;

    await supabase
      .from('activities')
      .delete()
      .eq('project_id', id);

    if (project.activities.length > 0) {
      const { error: activitiesError } = await supabase
        .from('activities')
        .insert(project.activities.map(a => ({
          activity_id: a.id,
          project_id: id,
          label: a.label,
          artia_id: a.artiaId
        })));

      if (activitiesError) throw activitiesError;
    }

    return this.findById(id);
  }

  async delete(id) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('project_id', id);

    if (error) throw error;
    return true;
  }

  async bulkCreate(projects) {
    for (const project of projects) {
      const { error: upsertError } = await supabase
        .from('projects')
        .upsert({
          project_id: project.id,
          number: project.number,
          name: project.name,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'number'
        });

      if (upsertError) throw upsertError;

      await supabase
        .from('activities')
        .delete()
        .eq('project_id', project.id);

      if (project.activities.length > 0) {
        const { error: activitiesError } = await supabase
          .from('activities')
          .insert(project.activities.map(a => ({
            activity_id: a.id,
            project_id: project.id,
            label: a.label,
            artia_id: a.artiaId
          })));

        if (activitiesError) throw activitiesError;
      }
    }

    return projects;
  }

  toDomain(projectRow, activitiesRows) {
    const activities = activitiesRows.map(a => new Activity({
      id: a.activity_id,
      label: a.label,
      artiaId: a.artia_id,
      projectId: projectRow.project_id
    }));

    return new Project({
      id: projectRow.project_id,
      number: projectRow.number,
      name: projectRow.name,
      activities
    });
  }
}
