import Button from '../common/Button/Button';
import {
  formatDate,
  formatHours,
  getComparisonStatusClassName,
  getComparisonStatusLabel
} from './comparisonFormatting';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'divergent', label: 'Divergências' },
  { key: 'match', label: 'Corretos' }
];

export default function ComparisonResultsTable({
  filter,
  dailyDetails,
  filteredComparisons,
  selectedDate,
  onFilterChange,
  onSelectDate
}) {
  return (
    <>
      <div className="ui-surface p-4">
        <div className="flex gap-2">
          {FILTERS.map((item) => {
            const count = item.key === 'all'
              ? dailyDetails.length
              : item.key === 'pending'
                ? dailyDetails.filter((entry) => entry.hasPendingSync).length
                : item.key === 'divergent'
                  ? dailyDetails.filter((entry) => entry.hasDivergence).length
                  : dailyDetails.filter((entry) => !entry.hasDivergence).length;

            return (
              <Button
                key={item.key}
                variant={filter === item.key ? 'primary' : 'secondary'}
                onClick={() => onFilterChange(item.key)}
                size="sm"
              >
                {item.label} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      <div className="ui-table-shell">
        <div className="ui-table-scroll">
          <table className="w-full text-slate-700 dark:text-slate-200">
            <thead className="ui-table-head">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Factorial</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Sistema</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Artia</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Pendente</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Manual</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredComparisons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredComparisons.map((comparison) => (
                  <tr
                    key={comparison.date}
                    onClick={() => onSelectDate(comparison.date)}
                    className={`cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                      comparison.date === selectedDate ? 'bg-primary/10' : comparison.hasDivergence ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm">{formatDate(comparison.date)}</td>
                    <td className="px-4 py-3 text-sm text-right ui-mono">{formatHours(comparison.factorialHours)}</td>
                    <td className="px-4 py-3 text-sm text-right ui-mono">{formatHours(comparison.systemHours)}</td>
                    <td className="px-4 py-3 text-sm text-right ui-mono">{formatHours(comparison.artiaHours)}</td>
                    <td className="px-4 py-3 text-sm text-right ui-mono">{formatHours(comparison.pendingSystemHours)}</td>
                    <td className="px-4 py-3 text-sm text-right ui-mono">{formatHours(comparison.manualSystemHours)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getComparisonStatusClassName(comparison)}`}>
                        {getComparisonStatusLabel(comparison)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
