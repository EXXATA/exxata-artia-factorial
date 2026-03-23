import Button from '../common/Button/Button';
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="ui-label mb-1 block">Data inicial</label>
            <input type="date" value={startDate} onChange={onStartDateChange} className="ui-input w-full" />
          </div>
          <div>
            <label className="ui-label mb-1 block">Data final</label>
            <input type="date" value={endDate} onChange={onEndDateChange} className="ui-input w-full" />
          </div>
          <div>
            <label className="ui-label mb-1 block">Projeto</label>
            <select value={projectFilter} onChange={onProjectChange} className="ui-input w-full">
              <option value="ALL">Todos os projetos</option>
              {projects.map((project) => (
                <option key={project.key || project.id} value={project.number}>{formatProjectOptionLabel(project)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-label mb-1 block">Atividade</label>
            <select value={activityFilter} onChange={onActivityChange} className="ui-input w-full">
              <option value="ALL">Todas as atividades</option>
              {availableActivities.map((activity) => (
                <option key={activity.key || `${activity.projectKey}-${activity.activityId || activity.label}`} value={activity.value || activity.label}>{activity.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={onRefresh} disabled={isFetching}>
              {isFetching ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
