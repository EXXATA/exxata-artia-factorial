export default function ChartsToolbar({
  endDate,
  groupBy,
  onEndDateChange,
  onGroupByChange,
  onProjectChange,
  onSourceChange,
  onStartDateChange,
  projectFilter,
  projectOptions,
  projectOptionLabel,
  source,
  startDate,
  totalLabel
}) {
  return (
    <section className="ui-toolbar">
      <div className="ui-toolbar-row">
        <div className="ui-toolbar-group">
          <div className="ui-toolbar-field ui-toolbar-field-sm">
            <label className="ui-label">De</label>
            <input type="date" value={startDate} onChange={onStartDateChange} className="ui-input w-full" />
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-sm">
            <label className="ui-label">Ate</label>
            <input type="date" value={endDate} onChange={onEndDateChange} className="ui-input w-full" />
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-lg">
            <label className="ui-label">Projeto</label>
            <select value={projectFilter} onChange={onProjectChange} className="ui-input w-full">
              <option value="ALL">Todos os projetos</option>
              {projectOptions.map((project) => (
                <option key={project.key} value={project.key}>{projectOptionLabel(project)}</option>
              ))}
            </select>
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-sm">
            <label className="ui-label">Agrupar por</label>
            <select value={groupBy} onChange={onGroupByChange} className="ui-input w-full">
              <option value="month">Meses</option>
              <option value="week">Semanas</option>
            </select>
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-sm">
            <label className="ui-label">Fonte</label>
            <select value={source} onChange={onSourceChange} className="ui-input w-full">
              <option value="system">Sistema</option>
              <option value="artia">Artia</option>
              <option value="combined">Soma</option>
            </select>
          </div>
        </div>

        <div className="ui-toolbar-actions">
          <span className="ui-toolbar-meta">{totalLabel}</span>
        </div>
      </div>
    </section>
  );
}
