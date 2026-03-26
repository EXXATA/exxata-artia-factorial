import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { buildViewUserScopeKey, getWeekViewQueryKey, VIEW_QUERY_STALE_MS } from './viewQueryKeys';
import { viewService } from '../services/api/viewService';

function normalizeResponse(response, fallbackMessage) {
  if (!response.success) {
    throw new Error(response.message || fallbackMessage);
  }

  return response.data;
}

export async function prefetchWeekViewData(queryClient, userScopeKey, filters) {
  return queryClient.prefetchQuery({
    queryKey: getWeekViewQueryKey(userScopeKey, filters),
    staleTime: VIEW_QUERY_STALE_MS,
    queryFn: async () => normalizeResponse(
      await viewService.getWeekView(filters),
      'Erro ao buscar visão detalhada'
    )
  });
}

export function useWeekViewData({ startDate, endDate, projectKey, activityKey, enabled = true } = {}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const userScopeKey = buildViewUserScopeKey(user);
  const queryKey = getWeekViewQueryKey(userScopeKey, { startDate, endDate, projectKey, activityKey });
  const canRun = isAuthenticated && !isLoading && enabled && Boolean(startDate) && Boolean(endDate);

  const query = useQuery({
    queryKey,
    enabled: canRun,
    staleTime: VIEW_QUERY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    queryFn: async () => normalizeResponse(
      await viewService.getWeekView({ startDate, endDate, projectKey, activityKey }),
      'Erro ao buscar visão detalhada'
    )
  });

  const refresh = async () => {
    if (!canRun) {
      return null;
    }

    const data = normalizeResponse(
      await viewService.getWeekView({ startDate, endDate, projectKey, activityKey, refresh: true }),
      'Erro ao atualizar visão detalhada'
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
