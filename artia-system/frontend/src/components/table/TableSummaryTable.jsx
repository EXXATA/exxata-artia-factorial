import { formatDate } from '../comparison/comparisonFormatting';
import { formatWorkedTime } from '../../utils/eventViewUtils';

function formatHours(hours) {
  return formatWorkedTime(Math.round((Number(hours) || 0) * 60));
}

function getStatusPresentation(detail) {
  if (detail.status === 'pending_sync') {
    return {
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      label: 'Pendente'
    };
  }

  if (detail.hasDivergence) {
    return {
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      label: 'Divergencia'
    };
  }

  return {
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    label: 'OK'
  };
}

export default function TableSummaryTable({ dailyDetails = [] }) {
  return (
    <section className="ui-table-shell">
      <div className="ui-table-scroll">
        <table className="min-w-full border-collapse text-sm text-slate-700 dark:text-slate-200">
          <thead className="ui-table-head">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Factorial</th>
              <th className="px-4 py-3">Sistema</th>
              <th className="px-4 py-3">Sincronizado</th>
              <th className="px-4 py-3">Pendente</th>
              <th className="px-4 py-3">Manual</th>
              <th className="px-4 py-3">Artia</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {dailyDetails.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                  Nenhum resumo encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              dailyDetails.map((detail) => {
                const status = getStatusPresentation(detail);

                return (
                  <tr key={detail.date} className="ui-table-row">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{formatDate(detail.date)}</td>
                    <td className="px-4 py-3 ui-mono">{formatHours(detail.factorialHours)}</td>
                    <td className="px-4 py-3 ui-mono">{formatHours(detail.systemHours)}</td>
                    <td className="px-4 py-3 ui-mono text-emerald-700 dark:text-emerald-200">{formatHours(detail.syncedSystemHours)}</td>
                    <td className="px-4 py-3 ui-mono text-sky-700 dark:text-sky-200">{formatHours(detail.pendingSystemHours)}</td>
                    <td className="px-4 py-3 ui-mono text-amber-700 dark:text-amber-200">{formatHours(detail.manualSystemHours)}</td>
                    <td className="px-4 py-3 ui-mono">{formatHours(detail.artiaHours)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
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
