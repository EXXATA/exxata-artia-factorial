export function toAuthErrorPayload({ message, code, data } = {}) {
  const payload = {
    success: false,
    message: message || 'Falha de autenticacao.'
  };

  if (code) {
    payload.code = code;
  }

  if (data !== undefined) {
    payload.data = data;
  }

  return payload;
}

export function sendAuthErrorResponse(res, status, errorLike = {}) {
  return res.status(status).json(toAuthErrorPayload(errorLike));
}
