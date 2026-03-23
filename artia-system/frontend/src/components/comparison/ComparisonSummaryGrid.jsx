import { formatHours } from './comparisonFormatting';

export default function ComparisonSummaryGrid({ stats }) {
  if (!stats) {
    return null;
  }

  return (
    <div className="ui-kpi-grid xl:grid-cols-8">
      <div className="ui-kpi-card">
        <p className="ui-kpi-label">Total de Dias</p>
        <p className="ui-kpi-value">{stats.totalDays}</p>
      </div>
      <div className="ui-kpi-card ui-kpi-card-warning">
        <p className="ui-kpi-label">Pendências de Sync</p>
        <p className="ui-kpi-value text-amber-700 dark:text-amber-100">{stats.daysPendingSync}</p>
      </div>
      <div className="ui-kpi-card ui-kpi-card-accent">
        <p className="ui-kpi-label">Horas Factorial</p>
        <p className="ui-kpi-value">{formatHours(stats.totalFactorialHours)}</p>
      </div>
      <div className="ui-kpi-card">
        <p className="ui-kpi-label">Horas Sistema</p>
        <p className="ui-kpi-value">{formatHours(stats.totalSystemHours)}</p>
      </div>
      <div className="ui-kpi-card">
        <p className="ui-kpi-label">Horas Artia</p>
        <p className="ui-kpi-value">{formatHours(stats.totalArtiaHours)}</p>
      </div>
      <div className="ui-kpi-card">
        <p className="ui-kpi-label">Horas Pendentes</p>
        <p className="ui-kpi-value text-sky-600 dark:text-sky-300">{formatHours(stats.totalPendingSystemHours)}</p>
      </div>
      <div className="ui-kpi-card ui-kpi-card-violet">
        <p className="ui-kpi-label">Só Artia</p>
        <p className="ui-kpi-value text-violet-700 dark:text-violet-100">{stats.remoteOnlyArtiaEntries || 0}</p>
      </div>
      <div className="ui-kpi-card">
        <p className="ui-kpi-label">Projetos</p>
        <p className="ui-kpi-value">{stats.projectCount || 0}</p>
      </div>
    </div>
  );
}
