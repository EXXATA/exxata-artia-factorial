import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/api/projectService';
import toast from 'react-hot-toast';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getAll
  });
}

export function useSearchProjects(query) {
  return useQuery({
    queryKey: ['projects', 'search', query],
    queryFn: () => projectService.search(query),
    enabled: !!query
  });
}

export function useProjectActivities(projectId) {
  return useQuery({
    queryKey: ['projects', projectId, 'activities'],
    queryFn: () => projectService.getActivities(projectId),
    enabled: !!projectId
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
