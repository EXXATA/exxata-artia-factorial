import { useQuery } from '@tanstack/react-query';
import { workedHoursService } from '../services/api/workedHoursService';

export function useWorkedHoursComparison({ startDate, endDate, project, activity, refresh = false, enabled = true } = {}) {
  return useQuery({
    queryKey: ['worked-hours-comparison', startDate || null, endDate || null, project || null, activity || null, refresh],
    enabled: enabled && Boolean(startDate) && Boolean(endDate),
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
