import { useQuery } from '@tanstack/react-query';
import { artiaClient } from '../services/artia/artiaClient';
import { localCache } from '../services/storage/localCache';

export function useArtiaProjects() {
  return useQuery({
    queryKey: ['artia-projects'],
    queryFn: async () => {
      // Tentar usar cache primeiro
      if (localCache.isCacheValid()) {
        const cached = localCache.getProjects();
        if (cached) {
          console.log('📦 Usando projetos do cache');
          return cached;
        }
      }

      // Buscar da API Artia
      console.log('🌐 Buscando projetos da API Artia');
      const projects = await artiaClient.getProjects();
      
      // Salvar no cache
      localCache.saveProjects(projects);
      
      return projects;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 horas
    cacheTime: 24 * 60 * 60 * 1000,
    retry: 1
  });
}

export function useArtiaProjectActivities(projectId) {
  return useQuery({
    queryKey: ['artia-activities', projectId],
    queryFn: async () => {
      // Tentar usar cache primeiro
      const cached = localCache.getActivities(projectId);
      if (cached) {
        console.log('📦 Usando atividades do cache');
        return cached;
      }

      // Buscar da API Artia
      console.log('🌐 Buscando atividades da API Artia');
      const activities = await artiaClient.getProjectActivities(projectId);
      
      // Salvar no cache
      localCache.saveActivities(projectId, activities);
      
      return activities;
    },
    enabled: !!projectId,
    staleTime: 24 * 60 * 60 * 1000,
    cacheTime: 24 * 60 * 60 * 1000,
    retry: 1
  });
}

export function useSearchArtiaProjects(query) {
  return useQuery({
    queryKey: ['artia-search', query],
    queryFn: () => artiaClient.searchProjects(query),
    enabled: !!query && query.length > 2,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });
}
