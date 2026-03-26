import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../services/api/apiError';
import { eventService } from '../services/api/eventService';

export function useEvents(filters = {}) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventService.getAll(filters)
  });
}

export function useCreateEvent(options = {}) {
  const queryClient = useQueryClient();
  const {
    showSuccessToast = true,
    showErrorToast = true,
    invalidateQueries = true,
    onSuccess: onSuccessCallback
  } = options;

  return useMutation({
    mutationFn: eventService.create,
    onSuccess: (response, variables, context) => {
      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['views'] });
      }
      onSuccessCallback?.(response, variables, context);
      if (showSuccessToast) {
        toast.success('Evento criado com sucesso!');
      }
    },
    onError: (error) => {
      if (showErrorToast) {
        toast.error(getApiErrorMessage(error, 'Erro ao criar evento'));
      }
    }
  });
}

export function useUpdateEvent(options = {}) {
  const queryClient = useQueryClient();
  const {
    showSuccessToast = true,
    showErrorToast = true,
    invalidateQueries = true,
    onSuccess: onSuccessCallback
  } = options;

  return useMutation({
    mutationFn: ({ id, data }) => eventService.update(id, data),
    onSuccess: (response, variables, context) => {
      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['views'] });
      }
      onSuccessCallback?.(response, variables, context);
      if (showSuccessToast) {
        toast.success('Evento atualizado com sucesso!');
      }
    },
    onError: (error) => {
      if (showErrorToast) {
        toast.error(getApiErrorMessage(error, 'Erro ao atualizar evento'));
      }
    }
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eventService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['views'] });
      toast.success('Evento deletado com sucesso!');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao deletar evento'));
    }
  });
}

export function useMoveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, moveData }) => eventService.move(id, moveData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['views'] });
      toast.success('Evento movido com sucesso!');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao mover evento'));
    }
  });
}

export function useImportLegacyEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, mode }) => eventService.importLegacy(file, mode),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['views'] });
      const imported = response?.data?.imported ?? 0;
      toast.success(`${imported} eventos importados com sucesso!`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao importar apontamentos'));
    }
  });
}

export function useAnalyzeEventImport() {
  return useMutation({
    mutationFn: ({ file, mapping }) => eventService.analyzeImport(file, mapping),
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao analisar a planilha'));
    }
  });
}

export function useApplyEventImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows) => eventService.applyImport(rows),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['views'] });
      const imported = response?.data?.imported ?? 0;
      const skippedWarnings = response?.data?.skippedWarnings ?? 0;
      toast.success(
        skippedWarnings > 0
          ? `${imported} apontamento(s) importado(s); ${skippedWarnings} aviso(s) ignorado(s).`
          : `${imported} apontamento(s) importado(s) com sucesso!`
      );
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao aplicar a importacao'));
    }
  });
}
