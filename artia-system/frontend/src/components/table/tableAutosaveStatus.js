function formatAutosaveTime(lastSavedAt) {
  if (!lastSavedAt) {
    return null;
  }

  const parsedDate = new Date(lastSavedAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsedDate);
}

function formatAutosaveError(lastErrorMessage, lastSavedAt) {
  const normalizedMessage = String(lastErrorMessage || '').trim();
  const formattedTime = formatAutosaveTime(lastSavedAt);

  if (!normalizedMessage) {
    return formattedTime
      ? `Falha ao sincronizar. Valor revertido para o ultimo salvo as ${formattedTime}.`
      : 'Falha ao sincronizar. Valor revertido para o ultimo salvo.';
  }

  return formattedTime
    ? `Falha ao sincronizar: ${normalizedMessage}. Ultimo salvo as ${formattedTime}.`
    : `Falha ao sincronizar: ${normalizedMessage}.`;
}

export function getAutosaveStatusPresentation({
  isSaving = false,
  lastSavedAt = null,
  lastErrorMessage = null
} = {}) {
  if (isSaving) {
    return {
      tone: 'saving',
      label: 'Salvando automaticamente...'
    };
  }

  if (lastErrorMessage) {
    return {
      tone: 'error',
      label: formatAutosaveError(lastErrorMessage, lastSavedAt)
    };
  }

  const formattedTime = formatAutosaveTime(lastSavedAt);
  if (formattedTime) {
    return {
      tone: 'saved',
      label: `Salvo automaticamente as ${formattedTime}`
    };
  }

  return {
    tone: 'idle',
    label: 'Edicoes sincronizam automaticamente em segundo plano.'
  };
}
