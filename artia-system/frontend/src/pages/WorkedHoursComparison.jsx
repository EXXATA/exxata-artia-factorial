import { useState, useEffect } from 'react';
import { workedHoursService } from '../services/api/workedHoursService';
import Button from '../components/common/Button/Button';
import toast from 'react-hot-toast';

export default function WorkedHoursComparison() {
  const [comparisons, setComparisons] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, divergent, match

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const response = await workedHoursService.getFullHistory();
      
      if (response.success) {
        setComparisons(response.data.comparisons);
        setStats(response.data.stats);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredComparisons = comparisons.filter(comp => {
    if (filter === 'pending') return comp.hasPendingSync;
    if (filter === 'divergent') return comp.hasDivergence;
    if (filter === 'match') return !comp.hasDivergence;
    return true;
  });

  const getStatusPresentation = (comparison) => {
    if (comparison.status === 'pending_sync') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }

    if (comparison.hasDivergence) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }

    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  };

  const getStatusLabel = (comparison) => {
    if (comparison.status === 'pending_sync') {
      return 'Pendente';
    }

    return comparison.hasDivergence ? 'Divergência' : 'OK';
  };

  const formatHours = (hours) => {
    return hours.toFixed(2) + 'h';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-light-muted dark:text-dark-muted">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Comparação de Horas</h1>
        <p className="text-light-muted dark:text-dark-muted">
          Comparação entre o Factorial, o sistema local e os apontamentos efetivamente encontrados no Artia via MySQL.
        </p>
      </div>

      {stats && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${stats.artiaSourceAvailable ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/30 bg-amber-500/10 text-amber-100'}`}>
          {stats.artiaSourceAvailable
            ? `Leitura do Artia ativa via MySQL${stats.artiaSourceTable ? ` · fonte ${stats.artiaSourceTable}` : ''}`
            : 'Leitura do Artia indisponível no momento. Os dados remotos não puderam ser confirmados automaticamente.'}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <div className="bg-light-panel dark:bg-dark-panel p-4 rounded-lg">
            <p className="text-sm text-light-muted dark:text-dark-muted mb-1">Total de Dias</p>
            <p className="text-2xl font-bold">{stats.totalDays}</p>
          </div>
          <div className="bg-light-panel dark:bg-dark-panel p-4 rounded-lg">
            <p className="text-sm text-light-muted dark:text-dark-muted mb-1">Pendências de Sync</p>
            <p className="text-2xl font-bold text-amber-500">{stats.daysPendingSync}</p>
          </div>
          <div className="bg-light-panel dark:bg-dark-panel p-4 rounded-lg">
            <p className="text-sm text-light-muted dark:text-dark-muted mb-1">Horas Factorial</p>
            <p className="text-2xl font-bold">{formatHours(stats.totalFactorialHours)}</p>
          </div>
          <div className="bg-light-panel dark:bg-dark-panel p-4 rounded-lg">
            <p className="text-sm text-light-muted dark:text-dark-muted mb-1">Horas Sistema</p>
            <p className="text-2xl font-bold">{formatHours(stats.totalSystemHours)}</p>
          </div>
          <div className="bg-light-panel dark:bg-dark-panel p-4 rounded-lg">
            <p className="text-sm text-light-muted dark:text-dark-muted mb-1">Horas Artia</p>
            <p className="text-2xl font-bold">{formatHours(stats.totalArtiaHours)}</p>
          </div>
          <div className="bg-light-panel dark:bg-dark-panel p-4 rounded-lg">
            <p className="text-sm text-light-muted dark:text-dark-muted mb-1">Horas Pendentes</p>
            <p className="text-2xl font-bold text-sky-500">{formatHours(stats.totalPendingSystemHours)}</p>
          </div>
        </div>
      )}

      <div className="bg-light-panel dark:bg-dark-panel rounded-lg p-4 mb-4">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            Todos ({comparisons.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'primary' : 'secondary'}
            onClick={() => setFilter('pending')}
            size="sm"
          >
            Pendentes ({comparisons.filter(c => c.hasPendingSync).length})
          </Button>
          <Button
            variant={filter === 'divergent' ? 'primary' : 'secondary'}
            onClick={() => setFilter('divergent')}
            size="sm"
          >
            Divergências ({comparisons.filter(c => c.hasDivergence).length})
          </Button>
          <Button
            variant={filter === 'match' ? 'primary' : 'secondary'}
            onClick={() => setFilter('match')}
            size="sm"
          >
            Corretos ({comparisons.filter(c => !c.hasDivergence).length})
          </Button>
        </div>
      </div>

      <div className="bg-light-panel dark:bg-dark-panel rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-light-panel2 dark:bg-dark-panel2">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Factorial</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Sistema</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Artia</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Pendente</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Dif. F x A</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Dif. S x A</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {filteredComparisons.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-light-muted dark:text-dark-muted">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                filteredComparisons.map((comp, index) => (
                  <tr 
                    key={index}
                    className={`hover:bg-light-panel2 dark:hover:bg-dark-panel2 ${
                      comp.hasDivergence ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm">{formatDate(comp.date)}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatHours(comp.factorialHours)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatHours(comp.systemHours)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatHours(comp.artiaHours)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-sky-500 dark:text-sky-300">
                      {formatHours(comp.pendingSystemHours)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono font-bold ${
                      comp.difference > 0 ? 'text-green-600 dark:text-green-400' : 
                      comp.difference < 0 ? 'text-red-600 dark:text-red-400' : 
                      'text-light-muted dark:text-dark-muted'
                    }`}>
                      {comp.difference > 0 ? '+' : ''}{formatHours(comp.difference)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono font-bold ${
                      comp.systemDifference > 0 ? 'text-sky-600 dark:text-sky-400' : 
                      comp.systemDifference < 0 ? 'text-amber-600 dark:text-amber-400' : 
                      'text-light-muted dark:text-dark-muted'
                    }`}>
                      {comp.systemDifference > 0 ? '+' : ''}{formatHours(comp.systemDifference)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusPresentation(comp)}`}>
                        {getStatusLabel(comp)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
