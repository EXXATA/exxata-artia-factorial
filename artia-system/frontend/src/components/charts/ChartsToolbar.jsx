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
      <div className="ui-toolbar-group">
        <label className="ui-label">Periodo</label>
        <input type="date" value={startDate} onChange={onStartDateChange} className="ui-input" />
        <span className="ui-muted">-</span>
        <input type="date" value={endDate} onChange={onEndDateChange} className="ui-input" />
        <label className="ui-label">Projeto</label>
        <select value={projectFilter} onChange={onProjectChange} className="ui-input min-w-[220px]">
          <option value="ALL">Todos os projetos</option>
          {projectOptions.map((project) => (
            <option key={project.key} value={project.number}>{projectOptionLabel(project)}</option>
          ))}
        </select>
        <label className="ui-label">Agrupar por</label>
        <select value={groupBy} onChange={onGroupByChange} className="ui-input">
          <option value="month">Meses</option>
          <option value="week">Semanas</option>
        </select>
        <label className="ui-label">Fonte</label>
        <select value={source} onChange={onSourceChange} className="ui-input">
          <option value="system">Sistema</option>
          <option value="artia">Artia</option>
          <option value="combined">Soma</option>
        </select>
        <span className="ui-chip ui-chip-accent">{totalLabel}</span>
      </div>
    </section>
  );
}
