import { useState } from 'react';
import Modal from '../common/Modal/Modal';
import Button from '../common/Button/Button';
import toast from 'react-hot-toast';

export default function ImportModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({
    date: '',
    startTime: '',
    endTime: '',
    project: '',
    activity: '',
    activityId: '',
    notes: ''
  });
  const [preview, setPreview] = useState([]);
  const [step, setStep] = useState(1); // 1: Upload, 2: Mapeamento, 3: Preview

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Ler arquivo para detectar colunas
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      
      if (lines.length > 0) {
        // Primeira linha = headers
        const cols = lines[0].split(/[,;\t]/).map(h => h.trim().replace(/"/g, ''));
        setHeaders(cols);

        // Preview das primeiras 5 linhas
        const previewData = lines.slice(1, 6).map(line => {
          const values = line.split(/[,;\t]/).map(v => v.trim().replace(/"/g, ''));
          return cols.reduce((obj, col, idx) => {
            obj[col] = values[idx] || '';
            return obj;
          }, {});
        });
        setPreview(previewData);

        // Auto-detectar colunas comuns
        autoDetectColumns(cols);
        setStep(2);
      }
    };
    reader.readAsText(selectedFile);
  };

  const autoDetectColumns = (cols) => {
    const newMapping = { ...mapping };

    cols.forEach(col => {
      const lower = col.toLowerCase();
      
      if (lower.includes('data') || lower.includes('date') || lower.includes('dia')) {
        newMapping.date = col;
      }
      if (lower.includes('início') || lower.includes('inicio') || lower.includes('start') || lower.includes('de')) {
        newMapping.startTime = col;
      }
      if (lower.includes('fim') || lower.includes('end') || lower.includes('término') || lower.includes('ate') || lower.includes('até')) {
        newMapping.endTime = col;
      }
      if (lower.includes('projeto') || lower.includes('project')) {
        newMapping.project = col;
      }
      if (lower.includes('atividade') || lower.includes('activity') || lower.includes('tarefa')) {
        newMapping.activity = col;
      }
      if (lower.includes('id') && (lower.includes('artia') || lower.includes('atividade'))) {
        newMapping.activityId = col;
      }
      if (lower.includes('nota') || lower.includes('observ') || lower.includes('note') || lower.includes('descri')) {
        newMapping.notes = col;
      }
    });

    setMapping(newMapping);
  };

  const handleImport = () => {
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }

    if (!mapping.date || !mapping.startTime || !mapping.endTime) {
      toast.error('Mapeie pelo menos: Data, Hora Início e Hora Fim');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').slice(1); // Pular header
      
      const events = lines
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(/[,;\t]/).map(v => v.trim().replace(/"/g, ''));
          const row = headers.reduce((obj, col, idx) => {
            obj[col] = values[idx] || '';
            return obj;
          }, {});

          const date = row[mapping.date];
          const startTime = row[mapping.startTime];
          const endTime = row[mapping.endTime];

          // Combinar data + hora
          const start = new Date(`${date}T${startTime}`);
          const end = new Date(`${date}T${endTime}`);

          return {
            day: date,
            start: start.toISOString(),
            end: end.toISOString(),
            project: row[mapping.project] || '',
            activityLabel: row[mapping.activity] || '',
            activityId: row[mapping.activityId] || '',
            notes: row[mapping.notes] || '',
            artiaLaunched: false
          };
        })
        .filter(e => e.start && e.end);

      onImport(events);
      toast.success(`${events.length} eventos importados!`);
      onClose();
      resetState();
    };
    reader.readAsText(file);
  };

  const resetState = () => {
    setFile(null);
    setHeaders([]);
    setMapping({
      date: '',
      startTime: '',
      endTime: '',
      project: '',
      activity: '',
      activityId: '',
      notes: ''
    });
    setPreview([]);
    setStep(1);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar Planilha" size="xl">
      {step === 1 && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-light-line dark:border-dark-line rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex flex-col items-center gap-3"
            >
              <div className="text-5xl">📄</div>
              <div className="text-lg font-medium">
                Clique para selecionar arquivo
              </div>
              <div className="text-sm text-light-muted dark:text-dark-muted">
                CSV, XLSX, XLS ou TXT
              </div>
            </label>
          </div>

          <div className="bg-light-panel2 dark:bg-dark-panel2 rounded-lg p-4">
            <h4 className="font-semibold mb-2">💡 Formatos aceitos:</h4>
            <ul className="text-sm space-y-1 text-light-muted dark:text-dark-muted">
              <li>• Exportação do Artia (CSV/XLSX)</li>
              <li>• Planilhas personalizadas</li>
              <li>• Separadores: vírgula, ponto-vírgula ou tabulação</li>
            </ul>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg p-4">
            <h4 className="font-semibold mb-3">🔗 Mapeamento de Colunas</h4>
            <p className="text-sm text-light-muted dark:text-dark-muted mb-4">
              Relacione as colunas da planilha com os campos do sistema
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Data <span className="text-danger">*</span>
                </label>
                <select
                  value={mapping.date}
                  onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-light-panel dark:bg-dark-panel border border-light-line dark:border-dark-line"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Hora Início <span className="text-danger">*</span>
                </label>
                <select
                  value={mapping.startTime}
                  onChange={(e) => setMapping({ ...mapping, startTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-light-panel dark:bg-dark-panel border border-light-line dark:border-dark-line"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Hora Fim <span className="text-danger">*</span>
                </label>
                <select
                  value={mapping.endTime}
                  onChange={(e) => setMapping({ ...mapping, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-light-panel dark:bg-dark-panel border border-light-line dark:border-dark-line"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Projeto</label>
                <select
                  value={mapping.project}
                  onChange={(e) => setMapping({ ...mapping, project: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-light-panel dark:bg-dark-panel border border-light-line dark:border-dark-line"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Atividade</label>
                <select
                  value={mapping.activity}
                  onChange={(e) => setMapping({ ...mapping, activity: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-light-panel dark:bg-dark-panel border border-light-line dark:border-dark-line"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">ID Artia</label>
                <select
                  value={mapping.activityId}
                  onChange={(e) => setMapping({ ...mapping, activityId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-light-panel dark:bg-dark-panel border border-light-line dark:border-dark-line"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Observações</label>
                <select
                  value={mapping.notes}
                  onChange={(e) => setMapping({ ...mapping, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-light-panel dark:bg-dark-panel border border-light-line dark:border-dark-line"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </div>

          {preview.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">👁️ Preview (primeiras 5 linhas)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-light-panel2 dark:bg-dark-panel2">
                    <tr>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-t border-light-line dark:border-dark-line">
                        {headers.map(h => (
                          <td key={h} className="px-3 py-2">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t border-light-line dark:border-dark-line">
            <Button variant="secondary" onClick={() => { resetState(); onClose(); }}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleImport}>
              Importar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
