import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal/Modal';
import Button from '../common/Button/Button';
import { useImportLegacyEvents } from '../../hooks/useEvents';
import { useImportProjects } from '../../hooks/useProjects';
import { exportService } from '../../services/api/exportService';

const INITIAL_FILTERS = {
  startDate: '',
  endDate: '',
  project: ''
};

export default function DataActionsModal({ isOpen, onClose }) {
  const importLegacyEvents = useImportLegacyEvents();
  const importProjects = useImportProjects();

  const [importType, setImportType] = useState('events');
  const [importMode, setImportMode] = useState('merge');
  const [showLegacyImport, setShowLegacyImport] = useState(false);
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState('');
  const [baseFileName, setBaseFileName] = useState('');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [exportingType, setExportingType] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setEmail(localStorage.getItem('exportEmail') || '');
    setBaseFileName(localStorage.getItem('artia_last_base_file_name') || '');
  }, [isOpen]);

  const isImporting = importLegacyEvents.isPending || importProjects.isPending;

  const resetImportState = () => {
    setFile(null);
    setImportMode('merge');
    setImportType('events');
    setShowLegacyImport(false);
  };

  const handleClose = () => {
    resetImportState();
    onClose();
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecione um arquivo para importar');
      return;
    }

    try {
      if (importType === 'events') {
        await importLegacyEvents.mutateAsync({ file, mode: importMode });
      } else {
        await importProjects.mutateAsync(file);
        localStorage.setItem('artia_last_base_file_name', file.name);
        setBaseFileName(file.name);
      }

      handleClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleExport = async (type) => {
    setExportingType(type);

    try {
      const normalizedFilters = Object.entries(filters).reduce((accumulator, [key, value]) => {
        if (value) {
          accumulator[key] = value;
        }

        return accumulator;
      }, {});

      if (type === 'csv') {
        const normalizedEmail = email.trim();
        if (normalizedEmail) {
          localStorage.setItem('exportEmail', normalizedEmail);
        }

        await exportService.exportCSV(normalizedFilters, normalizedEmail);
        toast.success('CSV exportado com sucesso!');
        return;
      }

      await exportService.exportXLSX({
        ...normalizedFilters,
        baseFileName: baseFileName.trim()
      });
      toast.success('Backup XLSX exportado com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao exportar dados');
    } finally {
      setExportingType('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Exportação e suporte" size="lg">
      <div className="space-y-6">
        <section className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4">
          <h3 className="text-lg font-semibold text-emerald-100">Fonte oficial atual</h3>
          <p className="mt-2 text-sm text-emerald-50/90">
            Projetos, atividades e leituras de horas devem vir do backend integrado ao Supabase, MySQL do Artia e Factorial.
            Os imports manuais em Excel permanecem apenas como contingência legada.
          </p>
        </section>

        <section className="space-y-4 border-t border-light-line dark:border-dark-line pt-6">
          <div>
            <h3 className="text-lg font-semibold">Exportação</h3>
            <p className="text-sm text-light-muted dark:text-dark-muted">
              Exporte CSV ou backup XLSX com o formato compatível com o sistema antigo.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-1">Data inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters(current => ({ ...current, startDate: event.target.value }))}
                className="w-full rounded-lg border border-light-line dark:border-dark-line bg-light-panel dark:bg-dark-panel px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters(current => ({ ...current, endDate: event.target.value }))}
                className="w-full rounded-lg border border-light-line dark:border-dark-line bg-light-panel dark:bg-dark-panel px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Projeto</label>
              <input
                type="text"
                value={filters.project}
                onChange={(event) => setFilters(current => ({ ...current, project: event.target.value }))}
                placeholder="Número do projeto"
                className="w-full rounded-lg border border-light-line dark:border-dark-line bg-light-panel dark:bg-dark-panel px-3 py-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">E-mail no CSV</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu-email@empresa.com"
                className="w-full rounded-lg border border-light-line dark:border-dark-line bg-light-panel dark:bg-dark-panel px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Arquivo base no backup XLSX</label>
              <input
                type="text"
                value={baseFileName}
                onChange={(event) => setBaseFileName(event.target.value)}
                placeholder="base_ids.xlsx"
                className="w-full rounded-lg border border-light-line dark:border-dark-line bg-light-panel dark:bg-dark-panel px-3 py-2"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => handleExport('csv')}
              disabled={exportingType !== ''}
            >
              {exportingType === 'csv' ? 'Exportando CSV...' : 'Exportar CSV'}
            </Button>
            <Button
              variant="primary"
              onClick={() => handleExport('xlsx')}
              disabled={exportingType !== ''}
            >
              {exportingType === 'xlsx' ? 'Exportando XLSX...' : 'Exportar XLSX'}
            </Button>
          </div>
        </section>

        <section className="space-y-4 border-t border-light-line dark:border-dark-line pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ferramentas legadas</h3>
              <p className="text-sm text-light-muted dark:text-dark-muted">
                Use apenas se for necessário recuperar apontamentos antigos ou uma base auxiliar fora do fluxo integrado atual.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setShowLegacyImport(current => !current)}>
              {showLegacyImport ? 'Ocultar importação legada' : 'Exibir importação legada'}
            </Button>
          </div>

          {showLegacyImport ? (
            <>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setImportType('events')}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                importType === 'events'
                  ? 'border-primary bg-primary/10 text-light-text dark:text-dark-text'
                  : 'border-light-line dark:border-dark-line bg-light-panel2 dark:bg-dark-panel2'
              }`}
            >
              <div className="font-medium">Apontamentos legados</div>
              <div className="text-sm text-light-muted dark:text-dark-muted">
                Importa a aba atividades do XLSX antigo em modo mesclar ou substituir.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setImportType('projects')}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                importType === 'projects'
                  ? 'border-primary bg-primary/10 text-light-text dark:text-dark-text'
                  : 'border-light-line dark:border-dark-line bg-light-panel2 dark:bg-dark-panel2'
              }`}
            >
              <div className="font-medium">Base de IDs</div>
              <div className="text-sm text-light-muted dark:text-dark-muted">
                Importa projetos e atividades para lookup de IDs via backend.
              </div>
            </button>
          </div>

          {importType === 'events' && (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="rounded-lg border border-light-line dark:border-dark-line px-4 py-3 flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={(event) => setImportMode(event.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Mesclar</div>
                  <div className="text-sm text-light-muted dark:text-dark-muted">
                    Mantém eventos existentes e ignora duplicados óbvios.
                  </div>
                </div>
              </label>

              <label className="rounded-lg border border-light-line dark:border-dark-line px-4 py-3 flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(event) => setImportMode(event.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Substituir</div>
                  <div className="text-sm text-light-muted dark:text-dark-muted">
                    Remove os eventos atuais do usuário antes de importar o XLSX legado.
                  </div>
                </div>
              </label>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Arquivo {importType === 'events' ? 'XLSX legado' : 'XLSX da base de IDs'}
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block w-full rounded-lg border border-light-line dark:border-dark-line bg-light-panel dark:bg-dark-panel px-3 py-2"
            />
            {file && (
              <div className="text-sm text-light-muted dark:text-dark-muted">
                Arquivo selecionado: <span className="font-medium">{file.name}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="primary" onClick={handleImport} disabled={isImporting}>
              {isImporting ? 'Importando...' : 'Importar'}
            </Button>
          </div>
            </>
          ) : (
            <div className="rounded-lg border border-light-line dark:border-dark-line bg-light-panel2 dark:bg-dark-panel2 px-4 py-3 text-sm text-light-muted dark:text-dark-muted">
              Os imports manuais foram mantidos apenas para contingência. O fluxo principal do sistema usa o catálogo sincronizado do Artia e os caches de horas do Supabase.
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
