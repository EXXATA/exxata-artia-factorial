const FALLBACK_LOCAL_API_URL = 'http://127.0.0.1:3100';

function isLocalHost() {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function isEmptyResponseData(data) {
  if (data == null) {
    return true;
  }

  if (typeof data === 'string') {
    return data.trim().length === 0;
  }

  if (typeof data === 'object') {
    return Object.keys(data).length === 0;
  }

  return false;
}

function resolveLocalApiUrl() {
  const configuredTarget = import.meta.env.VITE_API_PROXY_TARGET || FALLBACK_LOCAL_API_URL;
  return configuredTarget.replace('://localhost', '://127.0.0.1');
}

export function isApiUnavailableError(error) {
  if (!error) {
    return false;
  }

  if (error.code === 'API_UNAVAILABLE') {
    return true;
  }

  if (!isLocalHost()) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return error.response.status >= 500 && isEmptyResponseData(error.response.data);
}

export function normalizeApiError(error) {
  if (!isApiUnavailableError(error)) {
    return error;
  }

  const normalizedError = new Error(
    `API local indisponivel. Inicie o backend em ${resolveLocalApiUrl()} e tente novamente.`
  );

  normalizedError.code = 'API_UNAVAILABLE';
  normalizedError.cause = error;
  normalizedError.response = error.response;
  return normalizedError;
}

export function getApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}
