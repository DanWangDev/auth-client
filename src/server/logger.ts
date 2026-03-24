export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export function createLogger(context: Record<string, string> = {}): Logger {
  const base = { service: 'auth-client', ...context }

  function log(level: string, message: string, meta?: Record<string, unknown>): void {
    const entry = JSON.stringify({
      level,
      message,
      ts: new Date().toISOString(),
      ...base,
      ...meta,
    })
    if (level === 'error') {
      process.stderr.write(entry + '\n')
    } else {
      process.stdout.write(entry + '\n')
    }
  }

  return {
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  }
}
