import { formatDate, formatHours } from './comparisonFormatting';

function SummaryCard({ title, children }) {
  return (
    <div className="ui-surface p-4">
      <h2 className="ui-title mb-3">{title}</h2>
      {children}
    </div>
  );
}

function SummaryList({ emptyMessage, items, renderItem }) {
  if (items.length === 0) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</div>;
  }

  return <div className="space-y-2">{items.map(renderItem)}</div>;
}

export default function ComparisonSidePanel({ selectedComparison, topProjects, visibleActivities }) {
  return (
    <div className="space-y-4">
      <SummaryCard title="Detalhe do dia">
        {selectedComparison ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#111827]">
              <div className="font-semibold">{formatDate(selectedComparison.date)}</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>Factorial <span className="ui-mono">{formatHours(selectedComparison.factorialHours)}</span></div>
                <div>Sistema <span className="ui-mono">{formatHours(selectedComparison.systemHours)}</span></div>
                <div>Artia <span className="ui-mono">{formatHours(selectedComparison.artiaHours)}</span></div>
                <div>Pendente <span className="ui-mono">{formatHours(selectedComparison.pendingSystemHours)}</span></div>
                <div>Manual <span className="ui-mono">{formatHours(selectedComparison.manualSystemHours)}</span></div>
                <div>Diferença <span className="ui-mono">{formatHours(selectedComparison.difference)}</span></div>
              </div>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              O detalhamento evento a evento ficou restrito às visões semanais. Nesta tela longa os dados são agregados para manter a resposta imediata.
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500 dark:text-slate-400">Selecione um dia para ver o resumo.</div>
        )}
      </SummaryCard>

      <SummaryCard title="Resumo por projeto">
        <SummaryList
          emptyMessage="Nenhum projeto no período."
          items={topProjects}
          renderItem={(summary) => (
            <div key={summary.projectKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-[#111827]">
              <div className="font-medium">{summary.projectLabel || summary.projectNumber || summary.projectName}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="ui-chip px-2 py-0.5">Factorial {formatHours(summary.factorialHours)}</span>
                <span className="ui-chip px-2 py-0.5">Sistema {formatHours(summary.systemHours)}</span>
                <span className="ui-chip ui-chip-success px-2 py-0.5">Artia {formatHours(summary.artiaHours)}</span>
              </div>
            </div>
          )}
        />
      </SummaryCard>

      <SummaryCard title="Resumo por atividade">
        <SummaryList
          emptyMessage="Nenhuma atividade no período."
          items={visibleActivities}
          renderItem={(summary) => (
            <div key={summary.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-[#111827]">
              <div className="font-medium">{summary.activityLabel}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{summary.projectLabel || summary.projectNumber || summary.projectName}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="ui-chip px-2 py-0.5">Sistema {formatHours(summary.systemHours)}</span>
                <span className="ui-chip ui-chip-success px-2 py-0.5">Artia {formatHours(summary.artiaHours)}</span>
                {summary.remoteOnlyArtiaHours > 0 ? (
                  <span className="ui-chip ui-chip-violet px-2 py-0.5">Só Artia {formatHours(summary.remoteOnlyArtiaHours)}</span>
                ) : null}
              </div>
            </div>
          )}
        />
      </SummaryCard>
    </div>
  );
}
