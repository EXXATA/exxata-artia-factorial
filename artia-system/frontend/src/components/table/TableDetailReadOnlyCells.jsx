import { getReadOnlyClampClassName } from './tableDetailColumns.js';

export function ReadOnlyClamp({ value, fallback = '-', className = '', title = '' }) {
  const resolvedValue = value || fallback;
  const resolvedTitle = title || resolvedValue;

  return (
    <span className={getReadOnlyClampClassName(className)} title={resolvedTitle}>
      {resolvedValue}
    </span>
  );
}

export function ReadOnlyMultiline({ value, fallback = '-' }) {
  return (
    <div className="min-w-0 break-words leading-5" title={value || fallback}>
      {value || fallback}
    </div>
  );
}

export function StatusBadgeList({ artiaLaunched, syncPresentation, endEstimated, workplace }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${syncPresentation.badgeClassName}`}>
        {syncPresentation.label}
      </span>
      {artiaLaunched ? (
        <span className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-100">
          Lancado
        </span>
      ) : null}
      {endEstimated ? (
        <span className="inline-flex rounded-full border border-amber-300/40 bg-amber-500/15 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-100">
          Horario estimado
        </span>
      ) : null}
      {workplace ? (
        <span className="inline-flex rounded-full border border-slate-300/40 bg-slate-500/10 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-200">
          {workplace}
        </span>
      ) : null}
    </div>
  );
}

export function RemoteEntrySummary({ event }) {
  if (!event.artiaRemoteEntryId) {
    return (
      <span className="text-slate-400 dark:text-slate-500">
        {event.rowType === 'system'
          ? (event.artiaSourceAvailable ? 'Nao encontrado' : 'Leitura indisponivel')
          : '-'}
      </span>
    );
  }

  return (
    <div className="min-w-0 space-y-1">
      <ReadOnlyClamp
        value={event.artiaRemoteEntryId}
        className="ui-mono text-emerald-700 dark:text-emerald-100"
      />
      {event.artiaRemoteHours > 0 ? <div>{event.artiaRemoteHours.toFixed(2)}h</div> : null}
    </div>
  );
}
