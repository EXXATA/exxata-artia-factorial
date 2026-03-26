import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal/Modal';
import Button from '../common/Button/Button';
import { useAnalyzeEventImport, useApplyEventImport } from '../../hooks/useEvents';
import { extractTimeValue } from '../../utils/eventViewUtils';

const FIELD_ORDER = [
  'date',
  'startTime',
  'endTime',
  'project',
  'activity',
  'activityId',
  'notes',
  'artiaLaunched',
  'workplace'
];

const FIELD_LABELS = {
  date: 'Data',
  startTime: 'Hora Início',
  endTime: 'Hora de Término',
  project: 'Projeto',
  activity: 'Atividade',
  activityId: 'ID da Atividade',
  notes: 'Observação',
  artiaLaunched: 'Lançamento Artia',
  workplace: 'Local de trabalho'
};

const REQUIRED_FIELDS = new Set(['date', 'startTime', 'endTime', 'project', 'activity']);

function buildMappingState(suggestedMapping = {}) {
  return FIELD_ORDER.reduce((accumulator, field) => {
    accumulator[field] = suggestedMapping[field]?.columnName || '';
    return accumulator;
  }, {});
}

function getConfidencePresentation(confidence = 0) {
  if (confidence >= 0.95) {
    return {
      label: 'Alta',
      className: 'border-emerald-300 bg-emerald-500/10 text-emerald-100'
    };
  }

  if (confidence >= 0.75) {
    return {
      label: 'Média',
      className: 'border-amber-300 bg-amber-500/10 text-amber-100'
    };
  }

  return {
    label: 'Baixa',
    className: 'border-slate-300 bg-slate-500/10 text-slate-100'
  };
}

function getStatusPresentation(status) {
  if (status === 'critical') {
    return {
      label: 'Crítico',
      className: 'border-red-400/40 bg-red-500/15 text-red-100'
    };
  }

  if (status === 'warning') {
    return {
      label: 'Aviso',
      className: 'border-amber-400/40 bg-amber-500/15 text-amber-100'
    };
  }

  return {
    label: 'Válido',
    className: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
  };
}

export default function ImportModal({ isOpen, onClose, onApplied }) {
  const analyzeImport = useAnalyzeEventImport();
  const applyImport = useApplyEventImport();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [mapping, setMapping] = useState(() => buildMappingState());
  const [analysis, setAnalysis] = useState(null);

  const detectedColumns = analysis?.detectedColumns || [];
  const previewRows = analysis?.previewRows || [];
  const summary = analysis?.summary || {
    totalRows: 0,
    validRows: 0,
    warningRows: 0,
    criticalRows: 0
  };

  const canApply = summary.criticalRows === 0 && summary.validRows > 0 && !applyImport.isPending;
  const previewRowsToShow = useMemo(() => previewRows.slice(0, 20), [previewRows]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setStep(1);
    setFile(null);
    setMapping(buildMappingState());
    setAnalysis(null);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleAnalyze = async (nextStep = 2) => {
    if (!file) {
      return;
    }

    const response = await analyzeImport.mutateAsync({
      file,
      mapping: step === 1 ? {} : mapping
    });

    const nextAnalysis = response?.data || null;
    setAnalysis(nextAnalysis);
    setMapping(buildMappingState(nextAnalysis?.suggestedMapping));
    setStep(nextStep);
  };

  const handleApply = async () => {
    if (!canApply) {
      return;
    }

    await applyImport.mutateAsync(previewRows);
    onApplied?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar tabela" size="xl">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          <span className={step >= 1 ? 'text-primary' : ''}>1. Upload</span>
          <span>/</span>
          <span className={step >= 2 ? 'text-primary' : ''}>2. Mapeamento</span>
          <span>/</span>
          <span className={step >= 3 ? 'text-primary' : ''}>3. Preview</span>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-slate-300 px-6 py-10 text-center dark:border-white/10">
              <input
                id="table-import-file"
                type="file"
                accept=".csv,.xlsx"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="table-import-file" className="cursor-pointer space-y-2">
                <div className="text-lg font-semibold">{file ? file.name : 'Selecione um CSV ou XLSX'}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  O wizard sugere o mapeamento, mostra warnings/críticos e só adiciona novas linhas válidas.
                </div>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              O fluxo moderno aceita <span className="font-medium">CSV</span> e <span className="font-medium">XLSX</span>.
              Arquivos <span className="font-medium">XLS</span> binários antigos continuam no fluxo legado de suporte.
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => handleAnalyze(2)} disabled={!file || analyzeImport.isPending}>
                {analyzeImport.isPending ? 'Analisando...' : 'Analisar arquivo'}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Corrija o mapeamento quando necessário. Campos obrigatórios precisam estar preenchidos para gerar um preview útil.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {FIELD_ORDER.map((field) => {
                const suggestion = analysis?.suggestedMapping?.[field] || {};
                const confidence = getConfidencePresentation(suggestion.confidence);

                return (
                  <div key={field} className={field === 'notes' || field === 'workplace' ? 'md:col-span-2' : ''}>
                    <label className="mb-1 block text-sm font-medium">
                      {FIELD_LABELS[field]} {REQUIRED_FIELDS.has(field) ? <span className="text-red-400">*</span> : null}
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={mapping[field] || ''}
                        onChange={(event) => setMapping((current) => ({
                          ...current,
                          [field]: event.target.value
                        }))}
                        className="ui-input w-full"
                      >
                        <option value="">Não mapear</option>
                        {detectedColumns.map((column) => (
                          <option key={column.columnName} value={column.columnName}>
                            {column.columnName}
                          </option>
                        ))}
                      </select>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${confidence.className}`}>
                        {confidence.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
              <div className="mb-2 text-sm font-medium">Colunas detectadas</div>
              <div className="flex flex-wrap gap-2">
                {detectedColumns.map((column) => (
                  <span
                    key={column.columnName}
                    className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  >
                    {column.columnName}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setStep(1);
                  setAnalysis(null);
                  setMapping(buildMappingState());
                }}
              >
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={() => handleAnalyze(3)} disabled={!file || analyzeImport.isPending}>
                  {analyzeImport.isPending ? 'Atualizando...' : 'Gerar preview'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Linhas</div>
                <div className="mt-2 text-2xl font-semibold">{summary.totalRows}</div>
              </div>
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Válidas</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-50">{summary.validRows}</div>
              </div>
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Warnings</div>
                <div className="mt-2 text-2xl font-semibold text-amber-50">{summary.warningRows}</div>
              </div>
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-red-100/80">Críticos</div>
                <div className="mt-2 text-2xl font-semibold text-red-50">{summary.criticalRows}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10">
              {summary.criticalRows > 0
                ? 'A importação fica bloqueada enquanto houver linhas críticas.'
                : 'Somente linhas válidas serão adicionadas. Warnings permanecem visíveis e serão ignorados no apply.'}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-white/5">
                  <tr>
                    <th className="px-3 py-2 text-left">Linha</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Horário</th>
                    <th className="px-3 py-2 text-left">Projeto</th>
                    <th className="px-3 py-2 text-left">Atividade</th>
                    <th className="px-3 py-2 text-left">Observação</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRowsToShow.map((row) => {
                    const status = getStatusPresentation(row.status);
                    const normalized = row.normalized || {};

                    return (
                      <tr key={row.rowId} className="border-t border-slate-200 dark:border-white/10">
                        <td className="px-3 py-2 ui-mono">{row.rowNumber}</td>
                        <td className="px-3 py-2">{normalized.day || row.sourceValues?.date || '-'}</td>
                        <td className="px-3 py-2 ui-mono">
                          {normalized.start && normalized.end
                            ? `${extractTimeValue(normalized.start, normalized.day)} - ${extractTimeValue(normalized.end, normalized.day)}`
                            : `${row.sourceValues?.startTime || '-'} - ${row.sourceValues?.endTime || '-'}`
                          }
                        </td>
                        <td className="px-3 py-2">{normalized.project || row.sourceValues?.project || '-'}</td>
                        <td className="px-3 py-2">{normalized.activity?.label || row.sourceValues?.activity || '-'}</td>
                        <td className="max-w-[240px] truncate px-3 py-2">{normalized.notes || row.sourceValues?.notes || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                          {row.issues.length > 0
                            ? row.issues.map((issue) => issue.message).join(' ')
                            : 'Sem issues'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {previewRows.length > previewRowsToShow.length ? (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Exibindo as primeiras {previewRowsToShow.length} linhas de {previewRows.length}.
              </div>
            ) : null}

            <div className="flex justify-between gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Voltar ao mapeamento
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose} disabled={applyImport.isPending}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleApply} disabled={!canApply}>
                  {applyImport.isPending ? 'Aplicando...' : 'Aplicar importação'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
