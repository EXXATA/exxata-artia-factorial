import { formatDateBR } from '../../utils/dateUtils';
import { extractTimeValue, formatWorkedTime } from '../../utils/eventViewUtils';
import { getArtiaSyncPresentation } from '../../utils/artiaSyncUtils';

export default function TableDetailTable({
  dailyDetailsByDate,
  minutesByDay,
  onSelectEvent,
  onSelectRemoteEntry,
  rows
}) {
  return (
    <section className="ui-table-shell">
      <div className="ui-table-scroll">
        <table className="min-w-full border-collapse text-sm text-slate-700 dark:text-slate-200">
          <thead className="ui-table-head">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Projeto</th>
              <th className="px-4 py-3">Hora Inicio</th>
              <th className="px-4 py-3">Hora de Termino</th>
              <th className="px-4 py-3">Esforco</th>
              <th className="px-4 py-3">Esforco Dia</th>
              <th className="px-4 py-3">Factorial Dia</th>
              <th className="px-4 py-3">Atividade</th>
              <th className="px-4 py-3">Observacao</th>
              <th className="px-4 py-3">Status Artia</th>
              <th className="px-4 py-3">Registro Artia</th>
              <th className="px-4 py-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="13" className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                  Nenhum apontamento encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              rows.map((event) => {
                const syncPresentation = event.rowType === 'system'
                  ? getArtiaSyncPresentation(event.artiaSyncStatus)
                  : {
                    label: 'Somente Artia',
                    badgeClassName: 'border-violet-400/30 bg-violet-500/10 text-violet-100'
                  };
                const dayComparison = dailyDetailsByDate[event.day] || null;
                const rowDayMinutes = event.rowType === 'system'
                  ? (minutesByDay[event.day] || 0)
                  : Math.round((dayComparison?.artiaHours || 0) * 60);

                return (
                  <tr
                    key={`${event.rowType}-${event.id}`}
                    onClick={() => {
                      if (event.rowType === 'artia_only') {
                        onSelectRemoteEntry(event);
                        return;
                      }

                      if (event.rowType === 'system') {
                        onSelectEvent(event);
                      }
                    }}
                    className={`ui-table-row ${event.rowType === 'system' || event.rowType === 'artia_only' ? 'cursor-pointer' : ''} ${event.rowType === 'artia_only' ? 'bg-violet-50 dark:bg-violet-500/5' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{formatDateBR(event.day)}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 ${event.rowType === 'system' ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200' : 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-100'}`}>
                        {event.rowType === 'system' ? 'Sistema' : 'Artia'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{event.project}</td>
                    <td className="px-4 py-3 ui-mono">{extractTimeValue(event.start, event.day)}</td>
                    <td className="px-4 py-3 ui-mono">{extractTimeValue(event.end, event.day)}</td>
                    <td className="px-4 py-3 ui-mono text-primary dark:text-primary-light">{formatWorkedTime(event.effortMinutes)}</td>
                    <td className="px-4 py-3 ui-mono text-emerald-700 dark:text-emerald-200">{formatWorkedTime(rowDayMinutes)}</td>
                    <td className="px-4 py-3 ui-mono text-slate-600 dark:text-slate-300">{formatWorkedTime(Math.round((dayComparison?.factorialHours || 0) * 60))}</td>
                    <td className="px-4 py-3">{event.activityLabel}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-slate-500 dark:text-slate-400">{event.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${syncPresentation.badgeClassName}`}>
                          {syncPresentation.label}
                        </span>
                        {event.endEstimated ? (
                          <span className="inline-flex rounded-full border border-amber-300/40 bg-amber-500/15 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-100">
                            Horario estimado
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {event.artiaRemoteEntryId ? (
                        <div className="space-y-1">
                          <div className="ui-mono text-emerald-700 dark:text-emerald-100">{event.artiaRemoteEntryId}</div>
                          {event.artiaRemoteHours > 0 && <div>{event.artiaRemoteHours.toFixed(2)}h</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">{event.rowType === 'system' ? (event.artiaSourceAvailable ? 'Nao encontrado' : 'Leitura indisponivel') : '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{event.activityId || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
