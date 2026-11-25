/**
 * Minimal structured logger. Output goes to stdout/stderr, which Vercel collects
 * (Project → Logs). Never log secrets, full phone numbers or payment payloads.
 */
type Level = 'info' | 'warn' | 'error';

function write(level: Level, event: string, detail?: unknown) {
  const entry: Record<string, unknown> = { level, event, at: new Date().toISOString() };
  if (detail instanceof Error) entry.error = detail.message;
  else if (detail && typeof detail === 'object') entry.detail = detail;
  else if (detail !== undefined) entry.detail = String(detail);
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, detail?: unknown) => write('info', event, detail),
  warn: (event: string, detail?: unknown) => write('warn', event, detail),
  error: (event: string, detail?: unknown) => write('error', event, detail)
};

/** 0240000000 -> 024****000 */
export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length > 6 ? `${d.slice(0, 3)}****${d.slice(-3)}` : '***';
}
