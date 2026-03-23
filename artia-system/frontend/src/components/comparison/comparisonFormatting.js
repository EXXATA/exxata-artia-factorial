export function formatHours(hours) {
  return `${Number(hours || 0).toFixed(2)}h`;
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function getComparisonStatusClassName(comparison) {
  if (comparison.status === 'pending_sync') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  }

  if (comparison.hasDivergence) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }

  return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
}

export function getComparisonStatusLabel(comparison) {
  if (comparison.status === 'pending_sync') {
    return 'Pendente';
  }

  return comparison.hasDivergence ? 'Divergência' : 'OK';
}
