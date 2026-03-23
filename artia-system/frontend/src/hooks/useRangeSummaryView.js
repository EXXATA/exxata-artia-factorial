import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { buildViewUserScopeKey, getRangeSummaryQueryKey, VIEW_QUERY_STALE_MS } from './viewQueryKeys';
import { viewService } from '../services/api/viewService';

function normalizeResponse(response, fallbackMessage) {
  if (!response.success) {
    throw new Error(response.message || fallbackMessage);
  }

  return response.data;
}

export function useRangeSummaryView({ startDate, endDate, project, activity, enabled = true } = {}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const userScopeKey = buildViewUserScopeKey(user);
  const queryKey = getRangeSummaryQueryKey(userScopeKey, { startDate, endDate, project, activity });
  const canRun = isAuthenticated && !isLoading && enabled && Boolean(startDate) && Boolean(endDate);

  const query = useQuery({
    queryKey,
    enabled: canRun,
    staleTime: VIEW_QUERY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    queryFn: async () => normalizeResponse(
      await viewService.getRangeSummary({ startDate, endDate, project, activity }),
      'Erro ao buscar visão resumida'
    )
  });

  const refresh = async () => {
    if (!canRun) {
      return null;
    }

    const data = normalizeResponse(
      await viewService.getRangeSummary({ startDate, endDate, project, activity, refresh: true }),
      'Erro ao atualizar visão resumida'
    );
    queryClient.setQueryData(queryKey, data);
    return data;
  };

  return {
    ...query,
    refresh,
    queryKey,
    userScopeKey
  };
}
