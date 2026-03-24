import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from './logger.js'

describe('logger', () => {
  const originalStdout = process.stdout.write
  const originalStderr = process.stderr.write
  let stdoutOutput: string
  let stderrOutput: string

  beforeEach(() => {
    stdoutOutput = ''
    stderrOutput = ''
    process.stdout.write = vi.fn((chunk: string | Uint8Array) => {
      stdoutOutput += String(chunk)
      return true
    }) as typeof process.stdout.write
    process.stderr.write = vi.fn((chunk: string | Uint8Array) => {
      stderrOutput += String(chunk)
      return true
    }) as typeof process.stderr.write
  })

  afterEach(() => {
    process.stdout.write = originalStdout
    process.stderr.write = originalStderr
  })

  it('logs info messages to stdout', () => {
    const logger = createLogger()
    logger.info('test message')

    const parsed = JSON.parse(stdoutOutput.trim())
    expect(parsed.level).toBe('info')
    expect(parsed.message).toBe('test message')
    expect(parsed.service).toBe('auth-client')
    expect(parsed.ts).toBeTruthy()
  })

  it('logs error messages to stderr', () => {
    const logger = createLogger()
    logger.error('test error')

    const parsed = JSON.parse(stderrOutput.trim())
    expect(parsed.level).toBe('error')
    expect(parsed.message).toBe('test error')
  })

  it('includes custom context', () => {
    const logger = createLogger({ module: 'test-module' })
    logger.info('ctx test')

    const parsed = JSON.parse(stdoutOutput.trim())
    expect(parsed.module).toBe('test-module')
  })

  it('includes metadata', () => {
    const logger = createLogger()
    logger.warn('warn test', { userId: 42, op: 'test' })

    const parsed = JSON.parse(stdoutOutput.trim())
    expect(parsed.level).toBe('warn')
    expect(parsed.userId).toBe(42)
    expect(parsed.op).toBe('test')
  })
})
