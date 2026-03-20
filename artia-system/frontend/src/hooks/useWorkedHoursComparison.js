import { useQuery } from '@tanstack/react-query';
import { workedHoursService } from '../services/api/workedHoursService';
import { useAuth } from './useAuth';

export function useWorkedHoursComparison({ startDate, endDate, project, activity, refresh = false, enabled = true } = {}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const userScopeKey = user?.id || user?.email || 'anonymous';

  return useQuery({
    queryKey: ['worked-hours-comparison', userScopeKey, startDate || null, endDate || null, project || null, activity || null, refresh],
    enabled: isAuthenticated && !isLoading && enabled && Boolean(startDate) && Boolean(endDate),
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const response = await workedHoursService.getRangeComparison({
        startDate,
        endDate,
        project,
        activity,
        refresh
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao buscar comparação de horas');
      }

      return response.data;
    }
  });
}
