import { useState, useEffect } from 'react';
import { useMemo } from 'react';
import Button from '../common/Button/Button';
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from '../../hooks/useEvents';
import { useProjects } from '../../hooks/useProjects';
import toast from 'react-hot-toast';
import { calculateDuration, formatDuration } from '../../utils/timeUtils';
import { buildTimeOptions, combineDayAndTime, extractTimeValue, normalizeProjectInput } from '../../utils/eventViewUtils';

const CLIPBOARD_KEY = 'artia_event_modal_clipboard';

function createInitialFormData(event, draft) {
  return {
    day: event?.day || draft?.day || '',
    startTime: event?.start ? extractTimeValue(event.start) : draft?.startTime || '08:00',
    endTime: event?.end ? extractTimeValue(event.end) : draft?.endTime || '08:50',
    project: event?.project || draft?.project || '',
    activityLabel: event?.activityLabel || draft?.activityLabel || '',
    activityId: event?.activityId || draft?.activityId || '',
    notes: event?.notes || draft?.notes || '',
    artiaLaunched: event?.artiaLaunched || false,
    workplace: event?.workplace || draft?.workplace || ''
  };
}

export default function EventModal({ isOpen, onClose, event, draft }) {
  const isEditing = !!event;
  const [formData, setFormData] = useState(createInitialFormData(event, draft));

  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const { data: projectsData } = useProjects();
  const projects = projectsData?.data || [];

  const [duration, setDuration] = useState(0);
  const timeOptions = useMemo(() => buildTimeOptions(), []);

  const normalizedProject = useMemo(() => normalizeProjectInput(formData.project), [formData.project]);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.number) === normalizedProject) || null,
    [projects, normalizedProject]
  );

  const selectedActivity = useMemo(() => {
    if (!selectedProject || !formData.activityLabel) return null;
    return selectedProject.activities.find(
      (activity) => activity.label.trim().toLowerCase() === formData.activityLabel.trim().toLowerCase()
    ) || null;
  }, [selectedProject, formData.activityLabel]);

  const lookupId = selectedActivity?.artiaId || selectedActivity?.id || '';
  const effectiveActivityId = formData.activityId || lookupId;

  const idLookupPill = useMemo(() => {
    if (!selectedProject) {
      return {
        className: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
        dotClassName: 'bg-amber-300',
        text: 'ID: preencha manualmente (base não consultada)'
      };
    }

    if (selectedActivity && lookupId) {
      return {
        className: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100',
        dotClassName: 'bg-emerald-300',
        text: `ID encontrado automaticamente: ${lookupId}`
      };
    }

    return {
      className: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
      dotClassName: 'bg-amber-300',
      text: 'ID: preencha manualmente (atividade não encontrada)'
    };
  }, [lookupId, selectedActivity, selectedProject]);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(createInitialFormData(event, draft));
  }, [isOpen, event, draft]);

  useEffect(() => {
    if (formData.day && formData.startTime && formData.endTime) {
      const dur = calculateDuration(
        combineDayAndTime(formData.day, formData.startTime),
        combineDayAndTime(formData.day, formData.endTime)
      );
      setDuration(dur);
    }
  }, [formData.day, formData.startTime, formData.endTime]);

  useEffect(() => {
    if (!selectedActivity || !lookupId) return;
    setFormData((current) => ({
      ...current,
      activityId: current.activityId && current.activityId !== lookupId ? current.activityId : lookupId
    }));
  }, [selectedActivity, lookupId]);

  if (!isOpen) return null;

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleCopyFields = () => {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify({
      project: formData.project,
      activityLabel: formData.activityLabel,
      activityId: effectiveActivityId,
      notes: formData.notes,
      artiaLaunched: formData.artiaLaunched,
      workplace: formData.workplace
    }));
    toast.success('Campos copiados');
  };

  const handlePasteFields = () => {
    const clipboard = localStorage.getItem(CLIPBOARD_KEY);

    if (!clipboard) {
      toast.error('Nenhum conteúdo copiado');
      return;
    }

    const parsed = JSON.parse(clipboard);
    setFormData((current) => ({ ...current, ...parsed }));
    toast.success('Campos colados');
  };

  const handleProjectChange = (value) => {
    setFormData((current) => ({
      ...current,
      project: value,
      activityLabel: '',
      activityId: ''
    }));
  };

  const handleActivityChange = (value) => {
    setFormData((current) => ({
      ...current,
      activityLabel: value,
      activityId: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.day || !formData.project || !formData.activityLabel) {
      toast.error('Preencha data, projeto e atividade');
      return;
    }

    const start = combineDayAndTime(formData.day, formData.startTime);
    const end = combineDayAndTime(formData.day, formData.endTime);

    if (!start || !end || new Date(end) <= new Date(start)) {
      toast.error('O horário final deve ser maior que o inicial');
      return;
    }

    const eventData = {
      start,
      end,
      day: formData.day,
      project: normalizeProjectInput(formData.project) || formData.project,
      activity: {
        id: effectiveActivityId,
        label: formData.activityLabel
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
    if (window.confirm('Tem certeza que deseja deletar este evento?')) {
      await deleteMutation.mutateAsync(event.id);
      onClose();
    }
  };

  const workplaceOptions = ['Escritorio', 'Casa', 'Cliente'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-sky-500/20 bg-[radial-gradient(circle_at_top,_rgba(24,87,160,0.28),_rgba(4,12,22,0.98)_58%)] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="flex items-start justify-between gap-6 border-b border-white/10 px-7 py-6">
          <div>
            <h2 className="text-3xl font-semibold text-white">{isEditing ? 'Editar evento' : 'Novo evento'}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-slate-300">
              <input
                type="date"
                value={formData.day}
                onChange={(e) => setFormData((current) => ({ ...current, day: e.target.value }))}
                className="rounded-xl border border-white/10 bg-[#0b1a2e] px-4 py-2 text-sm text-white outline-none transition focus:border-primary"
              />
              <div className="rounded-xl border border-white/10 bg-[#091320] px-4 py-2 text-sm text-slate-300">
                {formData.day} {formData.startTime} → {formData.endTime}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleCopyFields} className="border border-white/10 text-white hover:bg-white/10">
              Copiar
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePasteFields} className="border border-white/10 text-white hover:bg-white/10">
              Colar
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl text-slate-200 transition hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-7 py-6">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Início (HH:MM)</label>
                  <select
                    value={formData.startTime}
                    onChange={(e) => setFormData((current) => ({ ...current, startTime: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#091320] px-4 py-3 text-lg text-white outline-none transition focus:border-primary"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Fim (HH:MM)</label>
                  <select
                    value={formData.endTime}
                    onChange={(e) => setFormData((current) => ({ ...current, endTime: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#091320] px-4 py-3 text-lg text-white outline-none transition focus:border-primary"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="-mt-2 text-sm text-slate-400">
                Os horários são em intervalos de 10 minutos. “24:00” representa o final do dia.
              </div>

              {duration > 0 && (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary-light">
                  Duração: <span className="font-semibold text-white">{formatDuration(duration)}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Projeto (nº do projeto)</label>
                <input
                  type="text"
                  list="projectOptions"
                  value={formData.project}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  placeholder="Ex.: 1360"
                  autoComplete="off"
                  className="w-full rounded-2xl border border-primary/30 bg-[#061221] px-5 py-4 text-lg text-white outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
                <datalist id="projectOptions">
                  {projects.map((project) => (
                    <option key={project.id} value={`${project.number} - ${project.name}${project.active ? '' : ' [Inativo]'}`} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Atividade (Nome)</label>
                <input
                  type="text"
                  list="activityOptions"
                  value={formData.activityLabel}
                  onChange={(e) => handleActivityChange(e.target.value)}
                  placeholder="Digite para buscar..."
                  autoComplete="off"
                  className="w-full rounded-2xl border border-white/10 bg-[#061221] px-5 py-4 text-lg text-white outline-none transition focus:border-primary"
                />
                <datalist id="activityOptions">
                  {(selectedProject?.activities || []).map((activity) => (
                    <option key={activity.id} value={activity.label} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">ID Artia (varia por projeto e por atividade)</label>
                  <input
                    type="text"
                    value={formData.activityId}
                    onChange={(e) => setFormData((current) => ({ ...current, activityId: e.target.value }))}
                    placeholder="Preenchido automaticamente se existir na base"
                    autoComplete="off"
                    className="w-full rounded-2xl border border-white/10 bg-[#061221] px-5 py-4 text-lg text-white outline-none transition focus:border-primary"
                  />
                </div>

                <div className={`flex min-h-[58px] items-center gap-3 rounded-full border px-5 py-3 text-sm ${idLookupPill.className}`}>
                  <span className={`h-3 w-3 rounded-full ${idLookupPill.dotClassName}`} />
                  <span>{idLookupPill.text}</span>
                </div>
              </div>

              <label className="flex items-center gap-3 text-base text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.artiaLaunched}
                  onChange={(e) => setFormData((current) => ({ ...current, artiaLaunched: e.target.checked }))}
                  className="h-5 w-5 rounded border-white/20 bg-transparent text-primary focus:ring-primary"
                />
                <span>Marcado manualmente como lançado no Artia</span>
              </label>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Local de trabalho</label>
                <div className="flex flex-wrap gap-3">
                  {workplaceOptions.map((option) => {
                    const isActive = formData.workplace === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData((current) => ({
                          ...current,
                          workplace: current.workplace === option ? '' : option
                        }))}
                        className={`rounded-2xl border px-5 py-3 text-sm font-medium transition ${
                          isActive
                            ? 'border-primary bg-primary/20 text-white shadow-[0_0_0_1px_rgba(78,161,255,0.3)]'
                            : 'border-white/10 bg-[#091320] text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        {option === 'Escritorio' ? 'Escritório' : option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Observação</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((current) => ({ ...current, notes: e.target.value }))}
                  placeholder="Escreva observações..."
                  rows={5}
                  className="w-full rounded-2xl border border-white/10 bg-[#061221] px-5 py-4 text-base text-white outline-none transition focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-[#071221]/90 px-7 py-5">
            <div className={`rounded-full border px-4 py-2 text-sm ${selectedProject?.active === false ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
              {selectedProject ? `Projeto: ${selectedProject.number} · ${selectedProject.name}${selectedProject.active === false ? ' · Inativo no catálogo' : ''}` : 'Selecione um projeto para ativar o preenchimento automático'}
            </div>

            <div className="flex items-center gap-3">
              {isEditing && (
                <Button type="button" variant="danger" onClick={handleDelete} disabled={isMutating}>
                  Apagar
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={onClose} disabled={isMutating} className="border border-white/10 text-white hover:bg-white/10">
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isMutating}>
                {isEditing ? 'Salvar' : 'Salvar'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
