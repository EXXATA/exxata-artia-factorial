import { useEffect, useMemo, useState } from 'react';
import Button from '../common/Button/Button';
import MinuteTimeField from './MinuteTimeField';
import { useCreateEvent, useDeleteEvent, useUpdateEvent } from '../../hooks/useEvents';
import { useProjects } from '../../hooks/useProjects';
import toast from 'react-hot-toast';
import { calculateDuration, formatDuration } from '../../utils/timeUtils';
import { combineDayAndTime, extractTimeValue, normalizeProjectInput } from '../../utils/eventViewUtils';

const CLIPBOARD_KEY = 'artia_event_modal_clipboard';
const WORKPLACE_OPTIONS = ['Escritorio', 'Casa', 'Cliente'];

function createInitialFormData(event, draft) {
  return {
    day: event?.day || draft?.day || '',
    startTime: event?.start ? extractTimeValue(event.start, event?.day) : draft?.startTime || '08:00',
    endTime: event?.end ? extractTimeValue(event.end, event?.day) : draft?.endTime || '08:50',
    project: normalizeProjectInput(event?.project || draft?.project || ''),
    activityLabel: event?.activityLabel || draft?.activityLabel || '',
    notes: event?.notes || draft?.notes || '',
    artiaLaunched: event?.artiaLaunched || false,
    workplace: event?.workplace || draft?.workplace || ''
  };
}

function sanitizeClipboardPayload(rawPayload, projects) {
  const payload = rawPayload || {};
  const nextState = {
    project: normalizeProjectInput(payload.project),
    activityLabel: String(payload.activityLabel || ''),
    notes: String(payload.notes || ''),
    artiaLaunched: Boolean(payload.artiaLaunched),
    workplace: String(payload.workplace || '')
  };

  const selectedProject = projects.find((project) => String(project.number) === nextState.project) || null;
  if (!selectedProject) {
    return {
      ...nextState,
      project: '',
      activityLabel: ''
    };
  }

  const selectedActivity = (selectedProject.activities || []).find((activity) => (
    activity.label.trim().toLowerCase() === nextState.activityLabel.trim().toLowerCase()
  )) || null;

  if (!selectedActivity) {
    return {
      ...nextState,
      activityLabel: ''
    };
  }

  return nextState;
}

export default function EventModal({ isOpen, onClose, event, draft }) {
  const isEditing = Boolean(event);
  const [formData, setFormData] = useState(createInitialFormData(event, draft));
  const [duration, setDuration] = useState(0);

  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ enabled: isOpen });
  const projects = projectsData?.data || [];

  const normalizedProject = useMemo(() => normalizeProjectInput(formData.project), [formData.project]);
  const selectedProject = useMemo(
    () => projects.find((project) => String(project.number) === normalizedProject) || null,
    [projects, normalizedProject]
  );
  const selectedActivity = useMemo(() => {
    if (!selectedProject || !formData.activityLabel) {
      return null;
    }

    return (selectedProject.activities || []).find((activity) => (
      activity.label.trim().toLowerCase() === formData.activityLabel.trim().toLowerCase()
    )) || null;
  }, [selectedProject, formData.activityLabel]);

  const resolvedActivityId = String(selectedActivity?.artiaId || selectedActivity?.id || event?.activityId || '').trim();
  const isHistoricalReadOnly = Boolean(
    isEditing && (
      event?.hasProjectAccess === false
      || (!projectsLoading && normalizedProject && !selectedProject)
    )
  );
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const canSubmit = Boolean(
    !isMutating
    && !projectsLoading
    && !isHistoricalReadOnly
    && formData.day
    && selectedProject
    && selectedActivity
    && resolvedActivityId
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData(createInitialFormData(event, draft));
  }, [isOpen, event, draft]);

  useEffect(() => {
    if (!formData.day || !formData.startTime || !formData.endTime) {
      setDuration(0);
      return;
    }

    const nextDuration = calculateDuration(
      combineDayAndTime(formData.day, formData.startTime),
      combineDayAndTime(formData.day, formData.endTime)
    );

    setDuration(nextDuration);
  }, [formData.day, formData.startTime, formData.endTime]);

  if (!isOpen) {
    return null;
  }

  const handleProjectChange = (value) => {
    setFormData((current) => ({
      ...current,
      project: value,
      activityLabel: ''
    }));
  };

  const handleCopyFields = () => {
    if (isHistoricalReadOnly) {
      return;
    }

    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify({
      project: formData.project,
      activityLabel: formData.activityLabel,
      notes: formData.notes,
      artiaLaunched: formData.artiaLaunched,
      workplace: formData.workplace
    }));
    toast.success('Campos copiados');
  };

  const handlePasteFields = () => {
    if (isHistoricalReadOnly) {
      return;
    }

    const clipboard = localStorage.getItem(CLIPBOARD_KEY);
    if (!clipboard) {
      toast.error('Nenhum conteudo copiado');
      return;
    }

    const parsed = JSON.parse(clipboard);
    const sanitized = sanitizeClipboardPayload(parsed, projects);

    setFormData((current) => ({
      ...current,
      ...sanitized
    }));

    toast.success('Campos colados');
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();

    if (isHistoricalReadOnly) {
      toast.error('Este evento esta fora do acesso atual do usuario no Artia.');
      return;
    }

    if (!selectedProject || !selectedActivity || !resolvedActivityId) {
      toast.error('Selecione um projeto e uma atividade acessiveis no Artia.');
      return;
    }

    const start = combineDayAndTime(formData.day, formData.startTime);
    const end = combineDayAndTime(formData.day, formData.endTime);

    if (!start || !end || new Date(end) <= new Date(start)) {
      toast.error('O horario final deve ser maior que o inicial.');
      return;
    }

    const eventData = {
      start,
      end,
      day: formData.day,
      project: selectedProject.number,
      activity: {
        id: resolvedActivityId,
        label: selectedActivity.label
      },
      notes: formData.notes,
      artiaLaunched: formData.artiaLaunched,
      workplace: formData.workplace || null
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: event.id, data: eventData });
    } else {
      await createMutation.mutateAsync(eventData);
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja deletar este evento?')) {
      return;
    }

    await deleteMutation.mutateAsync(event.id);
    onClose();
  };

  const projectSummaryText = selectedProject
    ? `${selectedProject.number} - ${selectedProject.name}${selectedProject.active === false ? ' (Inativo)' : ''}`
    : 'Selecione um projeto acessivel no Artia.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />

      <div className="ui-surface relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div>
            <h2 className="ui-title text-2xl">{isEditing ? 'Editar evento' : 'Novo evento'}</h2>
            <p className="ui-subtitle">
              Projeto e atividade seguem o acesso atual do usuario no Artia.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyFields}
              disabled={isMutating || isHistoricalReadOnly}
              className="border border-slate-200 dark:border-white/10"
            >
              Copiar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePasteFields}
              disabled={isMutating || isHistoricalReadOnly}
              className="border border-slate-200 dark:border-white/10"
            >
              Colar
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              X
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {isHistoricalReadOnly ? (
                <div className="ui-banner-warning">
                  Este evento ficou fora do acesso atual do usuario no Artia. O historico permanece visivel, mas a edicao esta bloqueada.
                </div>
              ) : null}

              {!projectsLoading && !projects.length && !isHistoricalReadOnly ? (
                <div className="ui-banner-warning">
                  Nenhum projeto acessivel foi encontrado para este usuario no Artia. O modal permanece aberto apenas para consulta.
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="ui-label">Data</label>
                  <input
                    type="date"
                    value={formData.day}
                    onChange={(inputEvent) => setFormData((current) => ({ ...current, day: inputEvent.target.value }))}
                    className="ui-input w-full"
                    disabled={isMutating || isHistoricalReadOnly}
                  />
                </div>

                <MinuteTimeField
                  label="Inicio"
                  value={formData.startTime}
                  onChange={(value) => setFormData((current) => ({ ...current, startTime: value }))}
                  disabled={isMutating || isHistoricalReadOnly}
                />

                <MinuteTimeField
                  label="Fim"
                  value={formData.endTime}
                  onChange={(value) => setFormData((current) => ({ ...current, endTime: value }))}
                  allowDayEnd
                  disabled={isMutating || isHistoricalReadOnly}
                />
              </div>

              <div className="ui-chip ui-chip-accent">
                Duracao: <span className="font-semibold">{duration > 0 ? formatDuration(duration) : '00:00'}</span>
              </div>

              <div className="space-y-2">
                <label className="ui-label">Projeto</label>
                {isHistoricalReadOnly ? (
                  <div className="ui-input flex min-h-[44px] items-center bg-slate-50 dark:bg-[#111827]">
                    {event?.project || 'Projeto sem acesso atual'}
                  </div>
                ) : (
                  <select
                    value={formData.project}
                    onChange={(inputEvent) => handleProjectChange(inputEvent.target.value)}
                    className="ui-input w-full"
                    disabled={isMutating || projectsLoading}
                  >
                    <option value="">Selecione um projeto</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.number}>
                        {project.number} - {project.name}{project.active === false ? ' (Inativo)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="ui-label">Atividade</label>
                {isHistoricalReadOnly ? (
                  <div className="ui-input flex min-h-[44px] items-center bg-slate-50 dark:bg-[#111827]">
                    {event?.activityLabel || 'Atividade sem acesso atual'}
                  </div>
                ) : (
                  <select
                    value={formData.activityLabel}
                    onChange={(inputEvent) => setFormData((current) => ({ ...current, activityLabel: inputEvent.target.value }))}
                    className="ui-input w-full"
                    disabled={isMutating || projectsLoading || !selectedProject}
                  >
                    <option value="">{selectedProject ? 'Selecione uma atividade' : 'Escolha primeiro um projeto'}</option>
                    {(selectedProject?.activities || []).map((activity) => (
                      <option key={`${selectedProject.id}-${activity.id}`} value={activity.label}>
                        {activity.label}{activity.active === false ? ' (Inativa)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="ui-label">ID Artia</label>
                <div className="ui-input flex min-h-[44px] items-center justify-between bg-slate-50 dark:bg-[#111827]">
                  <span className="font-medium text-slate-700 dark:text-slate-100">
                    {resolvedActivityId || 'Aguardando selecao valida'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Preenchimento automatico
                  </span>
                </div>
              </div>

              <div className={`rounded-2xl border px-4 py-3 text-sm ${selectedProject?.active === false ? 'ui-banner-warning' : 'ui-banner-success'}`}>
                {projectSummaryText}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.artiaLaunched}
                  onChange={(inputEvent) => setFormData((current) => ({ ...current, artiaLaunched: inputEvent.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  disabled={isMutating || isHistoricalReadOnly}
                />
                Marcado manualmente como lancado no Artia
              </label>

              <div className="space-y-3">
                <label className="ui-label">Local de trabalho</label>
                <div className="flex flex-wrap gap-2">
                  {WORKPLACE_OPTIONS.map((option) => {
                    const isActive = formData.workplace === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData((current) => ({
                          ...current,
                          workplace: current.workplace === option ? '' : option
                        }))}
                        disabled={isMutating || isHistoricalReadOnly}
                        className={`inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'border-primary bg-primary/10 text-primary dark:text-primary-light'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="ui-label">Observacao</label>
                <textarea
                  value={formData.notes}
                  onChange={(inputEvent) => setFormData((current) => ({ ...current, notes: inputEvent.target.value }))}
                  placeholder="Escreva observacoes..."
                  rows={4}
                  className="ui-input min-h-[120px] w-full resize-y"
                  disabled={isMutating || isHistoricalReadOnly}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-[#111827]/90">
            <div className="ui-muted text-sm">
              {isHistoricalReadOnly
                ? 'Historico visivel em modo somente leitura.'
                : projectsLoading
                  ? 'Carregando catalogo do Artia...'
                  : `${projects.length} projeto(s) acessivel(is) no catalogo atual.`}
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <Button type="button" variant="danger" onClick={handleDelete} disabled={isMutating}>
                  Apagar
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={onClose} disabled={isMutating}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={!canSubmit}>
                {isHistoricalReadOnly ? 'Somente leitura' : isEditing ? 'Salvar' : 'Criar evento'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
