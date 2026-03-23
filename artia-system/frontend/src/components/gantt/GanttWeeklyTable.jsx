import { formatWorkedTime } from '../../utils/eventViewUtils';

export default function GanttWeeklyTable({ comparisonByDay, rows, weekDayIsos, weekDays, weekFactorialMinutes }) {
  return (
    <section className="ui-table-shell">
      <div className="ui-table-scroll">
        <table className="min-w-[1100px] w-full border-separate border-spacing-0 text-sm text-slate-700 dark:text-slate-200">
          <thead className="ui-table-head">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-4 dark:bg-[#111827]">Projeto</th>
              <th className="px-4 py-4">Total Horas na Semana</th>
              {weekDays.map((day, index) => (
                <th key={index} className="px-4 py-4">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'][index]}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{day.toLocaleDateString('pt-BR')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                  Nenhuma hora consolidada para a semana atual.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const pendingOnlyMinutes = Math.max(0, row.pendingMinutes - row.manualMinutes);

                return (
                  <tr key={row.projectKey || row.projectLabel} className="ui-table-row">
                    <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-4 font-semibold text-slate-900 dark:border-white/5 dark:bg-[#0f172a] dark:text-white">
                      {row.projectLabel}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 dark:border-white/5">
                      <div className="ui-mono text-primary dark:text-primary-light">{formatWorkedTime(row.totalMinutes)}</div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        Factorial {formatWorkedTime(weekFactorialMinutes)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        {row.syncedMinutes > 0 && <span className="ui-chip ui-chip-success">Sincronizado {formatWorkedTime(row.syncedMinutes)}</span>}
                        {row.manualMinutes > 0 && <span className="ui-chip ui-chip-warning">Manual {formatWorkedTime(row.manualMinutes)}</span>}
                        {pendingOnlyMinutes > 0 && <span className="ui-chip">Pendente {formatWorkedTime(pendingOnlyMinutes)}</span>}
                        {row.remoteOnlyMinutes > 0 && <span className="ui-chip ui-chip-violet">So Artia {formatWorkedTime(row.remoteOnlyMinutes)}</span>}
                      </div>
                    </td>
                    {weekDayIsos.map((dayIso) => {
                      const daySummary = row.byDay[dayIso] || {
                        totalMinutes: 0,
                        syncedMinutes: 0,
                        pendingMinutes: 0,
                        manualMinutes: 0,
                        remoteOnlyMinutes: 0,
                        remoteOnlyCount: 0,
                        factorialMinutes: 0
                      };
                      const minutes = daySummary.totalMinutes;
                      const width = row.totalMinutes ? Math.max((minutes / row.totalMinutes) * 100, minutes > 0 ? 10 : 0) : 0;
                      const syncedWidth = minutes ? (daySummary.syncedMinutes / minutes) * 100 : 0;
                      const manualWidth = minutes ? (daySummary.manualMinutes / minutes) * 100 : 0;
                      const pendingOnly = Math.max(0, daySummary.pendingMinutes - daySummary.manualMinutes);
                      const pendingWidth = minutes ? (pendingOnly / minutes) * 100 : 0;

                      return (
                        <td key={dayIso} className="border-b border-slate-100 px-4 py-4 dark:border-white/5">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-[#111827]">
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/5">
                              <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${width}%` }}>
                                <div className="h-full bg-emerald-400" style={{ width: `${syncedWidth}%` }} />
                                <div className="h-full bg-amber-400" style={{ width: `${manualWidth}%` }} />
                                <div className="h-full bg-sky-400" style={{ width: `${pendingWidth}%` }} />
                              </div>
                            </div>
                            <div className={`mt-2 text-xs font-semibold ${minutes > 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-500'}`}>
                              {formatWorkedTime(minutes)}
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500">
                              F {formatWorkedTime(comparisonByDay[dayIso]?.factorialHours ? Math.round(comparisonByDay[dayIso].factorialHours * 60) : daySummary.factorialMinutes)}
                            </div>
                            {minutes > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                {daySummary.syncedMinutes > 0 && <span>S {formatWorkedTime(daySummary.syncedMinutes)}</span>}
                                {daySummary.manualMinutes > 0 && <span>M {formatWorkedTime(daySummary.manualMinutes)}</span>}
                                {pendingOnly > 0 && <span>P {formatWorkedTime(pendingOnly)}</span>}
                              </div>
                            )}
                            {daySummary.remoteOnlyCount > 0 ? (
                              <div className="mt-1 text-[10px] text-violet-700 dark:text-violet-300">
                                So Artia {daySummary.remoteOnlyCount} · {formatWorkedTime(daySummary.remoteOnlyMinutes)}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
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
