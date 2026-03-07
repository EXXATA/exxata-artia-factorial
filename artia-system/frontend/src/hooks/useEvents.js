import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../services/api/eventService';
import toast from 'react-hot-toast';

export function useEvents(filters = {}) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventService.getAll(filters)
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eventService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento criado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erro ao criar evento');
    }
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => eventService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar evento');
    }
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eventService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento deletado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar evento');
    }
  });
}

export function useMoveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, moveData }) => eventService.move(id, moveData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento movido com sucesso!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erro ao mover evento');
    }
  });
}

export function useImportLegacyEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, mode }) => eventService.importLegacy(file, mode),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      const imported = response?.data?.imported ?? 0;
      toast.success(`${imported} eventos importados com sucesso!`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erro ao importar apontamentos');
    }
  });
}
