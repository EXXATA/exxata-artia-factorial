import { formatProjectOptionLabel } from '../../utils/viewFilterOptions';

export default function ComparisonFilters({
  startDate,
  endDate,
  projectFilter,
  activityFilter,
  projects,
  availableActivities,
  isFetching,
  onStartDateChange,
  onEndDateChange,
  onProjectChange,
  onActivityChange,
  onRefresh
}) {
  return (
    <div className="ui-toolbar">
      <div className="ui-toolbar-row">
        <div className="ui-toolbar-group">
          <div className="ui-toolbar-field ui-toolbar-field-sm">
            <label className="ui-label">Data inicial</label>
            <input type="date" value={startDate} onChange={onStartDateChange} className="ui-input w-full" />
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-sm">
            <label className="ui-label">Data final</label>
            <input type="date" value={endDate} onChange={onEndDateChange} className="ui-input w-full" />
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-lg">
            <label className="ui-label">Projeto</label>
            <select value={projectFilter} onChange={onProjectChange} className="ui-input w-full">
              <option value="ALL">Todos os projetos</option>
              {projects.map((project) => (
                <option key={project.key || project.id} value={project.key}>{formatProjectOptionLabel(project)}</option>
              ))}
            </select>
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-lg">
            <label className="ui-label">Atividade</label>
            <select value={activityFilter} onChange={onActivityChange} className="ui-input w-full">
              <option value="ALL">Todas as atividades</option>
              {availableActivities.map((activity) => (
                <option key={activity.key || `${activity.projectKey}-${activity.activityId || activity.label}`} value={activity.key}>{activity.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ui-toolbar-actions">
          <button type="button" className="ui-toolbar-button ui-toolbar-button-secondary" onClick={onRefresh} disabled={isFetching}>
            {isFetching ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
