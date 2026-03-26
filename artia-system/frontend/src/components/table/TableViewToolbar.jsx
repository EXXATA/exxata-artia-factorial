import { formatProjectOptionLabel } from '../../utils/viewFilterOptions';

export default function TableViewToolbar({
  startDate,
  endDate,
  projectFilter,
  activityFilter,
  projectOptions,
  activityOptions,
  isDetailedMode,
  onStartDateChange,
  onEndDateChange,
  onProjectFilterChange,
  onActivityFilterChange,
  onOpenImport,
  onInsertInlineRow,
  onOpenNewEvent
}) {
  return (
    <section className="ui-toolbar">
      <div className="ui-toolbar-row">
        <div className="ui-toolbar-group">
          <div className="ui-toolbar-field ui-toolbar-field-sm">
            <label className="ui-label">De</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="ui-input w-full"
            />
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-sm">
            <label className="ui-label">Ate</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="ui-input w-full"
            />
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-lg">
            <label className="ui-label">Projeto</label>
            <select
              value={projectFilter}
              onChange={(event) => onProjectFilterChange(event.target.value)}
              className="ui-input w-full"
            >
              <option value="ALL">Todos os projetos</option>
              {projectOptions.map((project) => (
                <option key={project.key} value={project.key}>
                  {formatProjectOptionLabel(project)}
                </option>
              ))}
            </select>
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-lg">
            <label className="ui-label">Atividade</label>
            <select
              value={activityFilter}
              onChange={(event) => onActivityFilterChange(event.target.value)}
              className="ui-input w-full"
            >
              <option value="ALL">Todas as atividades</option>
              {activityOptions.map((activity) => (
                <option key={activity.key} value={activity.key}>
                  {activity.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ui-toolbar-actions">
          {isDetailedMode ? (
            <>
              <button
                onClick={onOpenImport}
                className="ui-toolbar-button ui-toolbar-button-secondary"
              >
                Importar tabela
              </button>
              <button
                onClick={onInsertInlineRow}
                className="ui-toolbar-button ui-toolbar-button-secondary"
              >
                Inserir linha na tabela
              </button>
            </>
          ) : null}

          <button
            onClick={onOpenNewEvent}
            className="ui-toolbar-button ui-toolbar-button-primary"
          >
            Novo apontamento
          </button>
        </div>
      </div>
    </section>
  );
}
