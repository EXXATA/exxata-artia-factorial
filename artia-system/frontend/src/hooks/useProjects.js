import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/api/projectService';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';

export function useProjects() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const userScopeKey = user?.id || user?.email || 'anonymous';

  return useQuery({
    queryKey: ['projects', userScopeKey],
    enabled: isAuthenticated && !isLoading,
    staleTime: 5 * 60 * 1000,
    queryFn: projectService.getAll
  });
}

export function useSearchProjects(query) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const userScopeKey = user?.id || user?.email || 'anonymous';

  return useQuery({
    queryKey: ['projects', userScopeKey, 'search', query],
    queryFn: () => projectService.search(query),
    enabled: isAuthenticated && !isLoading && !!query,
    staleTime: 5 * 60 * 1000
  });
}

export function useProjectActivities(projectId) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const userScopeKey = user?.id || user?.email || 'anonymous';

  return useQuery({
    queryKey: ['projects', userScopeKey, projectId, 'activities'],
    queryFn: () => projectService.getActivities(projectId),
    enabled: isAuthenticated && !isLoading && !!projectId,
    staleTime: 5 * 60 * 1000
  });
}

export function useImportProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectService.importProjects,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`${data?.data?.imported ?? 0} projetos importados com sucesso!`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erro ao importar projetos');
    }
  });
}
