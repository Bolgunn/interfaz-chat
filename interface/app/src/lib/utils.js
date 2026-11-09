import katex from 'katex';

/** Mensaje legible de un error de Apollo: usa el detalle del servicio si viene. */
export function errorText(error) {
  if (!error) return '';
  const gqlError = error.graphQLErrors?.[0];
  if (gqlError) {
    const service = gqlError.extensions?.service;
    return service ? `${gqlError.message} (${service})` : gqlError.message;
  }
  if (error.networkError) return 'No se pudo contactar al API Gateway.';
  return error.message;
}

/** Nombre del servicio que falló, si el error lo trae. */
export function failedService(error) {
  return error?.graphQLErrors?.find((e) => e.extensions?.service)?.extensions.service;
}

export function renderLatex(latex, displayMode = false) {
  return katex.renderToString(latex, { throwOnError: false, displayMode, strict: 'ignore' });
}

export const INTEGRAL_COMMAND = /^\/(?:integralcalc|integral)(?=\s|$)\s*(.*)$/s;

export function parseDate(value) {
  if (!value) return null;
  // Algunos servicios entregan fechas UTC sin zona: se interpretan como UTC.
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

export function formatTime(value) {
  const date = parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const BOT_NAME = 'integralbot';

export const SERVICE_LABELS = {
  users: 'Usuarios',
  channels: 'Canales',
  messages: 'Mensajes',
  integrals: 'Integrales',
  threads: 'Hilos',
  polls: 'Encuestas',
};
