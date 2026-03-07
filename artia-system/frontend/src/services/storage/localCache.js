// Cache local para projetos e atividades da API Artia
const CACHE_KEYS = {
  PROJECTS: 'artia_projects_cache',
  ACTIVITIES: 'artia_activities_cache',
  EVENTS: 'artia_events_local',
  LAST_SYNC: 'artia_last_sync'
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

class LocalCache {
  // Projetos
  saveProjects(projects) {
    localStorage.setItem(CACHE_KEYS.PROJECTS, JSON.stringify(projects));
    localStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
  }

  getProjects() {
    const cached = localStorage.getItem(CACHE_KEYS.PROJECTS);
    return cached ? JSON.parse(cached) : null;
  }

  // Atividades
  saveActivities(projectId, activities) {
    const key = `${CACHE_KEYS.ACTIVITIES}_${projectId}`;
    localStorage.setItem(key, JSON.stringify(activities));
  }

  getActivities(projectId) {
    const key = `${CACHE_KEYS.ACTIVITIES}_${projectId}`;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Eventos (apontamentos locais)
  saveEvents() {
    localStorage.removeItem(CACHE_KEYS.EVENTS);
  }

  getEvents() {
    return [];
  }

  addEvent() {
    localStorage.removeItem(CACHE_KEYS.EVENTS);
  }

  updateEvent() {
    localStorage.removeItem(CACHE_KEYS.EVENTS);
  }

  deleteEvent() {
    localStorage.removeItem(CACHE_KEYS.EVENTS);
  }

  // Verificar se cache está válido
  isCacheValid() {
    const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
    if (!lastSync) return false;
    
    const timeSinceSync = Date.now() - parseInt(lastSync);
    return timeSinceSync < CACHE_DURATION;
  }

  // Limpar cache
  clearCache() {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Limpar apenas eventos (manter cache de projetos)
  clearEvents() {
    localStorage.removeItem(CACHE_KEYS.EVENTS);
  }

  // Estatísticas do cache
  getCacheStats() {
    const projects = this.getProjects();
    const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);

    return {
      projectsCount: projects ? projects.length : 0,
      eventsCount: 0,
      lastSync: lastSync ? new Date(parseInt(lastSync)) : null,
      cacheValid: this.isCacheValid()
    };
  }
}

export const localCache = new LocalCache();
