import Button from '../common/Button/Button';
import { useWorkedHoursComparison } from '../../hooks/useWorkedHoursComparison';
import { formatWorkedTime } from '../../utils/eventViewUtils';

function formatHours(hours) {
  return formatWorkedTime(Math.round((Number(hours) || 0) * 60));
}

export default function WorkedHoursRangePanel({
  startDate,
  endDate,
  project,
  activity,
  title = 'Conciliação diária da semana',
  subtitle = 'Validação dia a dia entre Factorial, sistema e Artia na semana visível'
}) {
  const { data, isLoading, isError, error, refetch, isFetching } = useWorkedHoursComparison({
    startDate,
    endDate,
    project,
    activity,
    enabled: Boolean(startDate && endDate)
  });

  if (!startDate || !endDate) {
    return null;
  }

  const stats = data?.stats || null;
  const hasError = isError || (stats?.daysWithDivergence > 0);

  return (
    <section className="mb-6 flex flex-col gap-3">
      {/* Header Compacto */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </h3>

        {/* Info Icon + Tooltip */}
        <div className="group relative flex items-center justify-center">
          <button className={`p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${hasError ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-slate-400 hover:text-primary hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-white/5'}`}>
            {hasError ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          
          <div className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 w-64 -translate-x-1/2 translate-y-1 opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl dark:border-white/10 dark:bg-slate-800 relative">
              {/* Seta do Tooltip */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800"></div>
              
              <p className="font-semibold text-slate-900 dark:text-white mb-1 relative z-10">{title}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-2 leading-relaxed relative z-10">{subtitle}</p>
              <div className="text-xs font-mono bg-slate-100 dark:bg-black/20 p-1.5 rounded text-center relative z-10">
                {startDate} — {endDate}
              </div>
              {isError && (
                <div className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded border border-red-100 dark:border-red-500/20 relative z-10">
                  {error?.message || 'Erro de integração'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Refresh Button + Tooltip */}
        <div className="group relative ml-auto flex items-center">
          <button 
            onClick={() => refetch()} 
            disabled={isFetching}
            className={`p-1.5 rounded-md flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200`}
          >
            {isFetching ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          <div className="pointer-events-none absolute right-0 bottom-full z-50 mb-2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition-all group-hover:opacity-100 dark:bg-slate-700 translate-y-1 group-hover:translate-y-0">
            Atualizar comparação
            {/* Seta do Tooltip */}
            <div className="absolute -bottom-1 right-2 w-2 h-2 rotate-45 bg-slate-800 dark:bg-slate-700"></div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="ui-empty-state py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Carregando...
        </div>
      ) : !isError && stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-y-4">
          <div className="text-center px-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-0.5">Dias</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.totalDays}</div>
          </div>
          <div className="text-center px-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-amber-500/80 dark:text-amber-500/80 mb-0.5">Pendências</div>
            <div className={`text-xl font-bold ${stats.daysPendingSync > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-600'}`}>{stats.daysPendingSync}</div>
          </div>
          <div className="text-center px-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-red-500/80 dark:text-red-500/80 mb-0.5">Divergências</div>
            <div className={`text-xl font-bold ${stats.daysWithDivergence > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-600'}`}>{stats.daysWithDivergence}</div>
          </div>
          <div className="text-center px-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-0.5">Factorial</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 ui-mono">{formatHours(stats.totalFactorialHours)}</div>
          </div>
          <div className="text-center px-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-0.5">Sistema</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 ui-mono">{formatHours(stats.totalSystemHours)}</div>
          </div>
          <div className="text-center px-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-0.5">Artia</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 ui-mono">{formatHours(stats.totalArtiaHours)}</div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
