import Button from '../common/Button/Button';
import { formatDateBR } from '../../utils/dateUtils';
import { extractTimeValue, formatWorkedTime } from '../../utils/eventViewUtils';

function sortEntries(entries) {
  return [...(entries || [])].sort((left, right) => {
    const leftTime = left.start ? new Date(left.start).getTime() : 0;
    const rightTime = right.start ? new Date(right.start).getTime() : 0;
    return leftTime - rightTime;
  });
}

function buildIntervalLabel(entry) {
  if (!entry?.start) {
    return 'Horario indisponivel';
  }

  const startLabel = extractTimeValue(entry.start, entry.day);
  if (!entry?.end) {
    return `${startLabel} - duracao ${formatWorkedTime(entry.minutes || 0)}`;
  }

  return `${startLabel} - ${extractTimeValue(entry.end, entry.day)}`;
}

export default function ArtiaRemoteEntriesModal({
  isOpen,
  onClose,
  entries = [],
  title = 'Lancamentos do Artia',
  subtitle = 'Visualizacao somente leitura dos lancamentos encontrados no Artia via MySQL.'
}) {
  if (!isOpen) {
    return null;
  }

  const sortedEntries = sortEntries(entries);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />

      <div className="ui-surface relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div>
            <h2 className="ui-title text-2xl">{title}</h2>
            <p className="ui-subtitle">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            X
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="ui-chip ui-chip-violet">
              Somente Artia
            </span>
            <span className="ui-chip">
              {sortedEntries.length} lancamento(s)
            </span>
          </div>

          {!sortedEntries.length ? (
            <div className="ui-empty-state px-6 py-5">
              Nenhum lancamento remoto encontrado para este contexto.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEntries.map((entry) => (
                <section
                  key={entry.id}
                  className="rounded-2xl border border-violet-200/70 bg-violet-50/80 px-4 py-4 dark:border-violet-400/20 dark:bg-violet-500/5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {entry.projectDisplayLabel || entry.projectLabel || entry.project || 'Projeto Artia'}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {entry.activityLabel || entry.activity || 'Atividade Artia'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="ui-chip ui-chip-violet">
                        {buildIntervalLabel(entry)}
                      </span>
                      {entry.endEstimated ? (
                        <span className="ui-chip ui-chip-warning">
                          Horario estimado pelo Artia
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                      <div className="ui-label">Data</div>
                      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{formatDateBR(entry.day)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                      <div className="ui-label">Duracao</div>
                      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{formatWorkedTime(entry.minutes || 0)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                      <div className="ui-label">Registro remoto</div>
                      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white ui-mono">{entry.id || 'Sem ID'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                      <div className="ui-label">Origem</div>
                      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{entry.sourceTable || 'Artia MySQL'}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    <div className="ui-label">Observacao</div>
                    <div className="mt-1 whitespace-pre-wrap">{entry.notes || 'Sem observacao.'}</div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-[#111827]/90">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
