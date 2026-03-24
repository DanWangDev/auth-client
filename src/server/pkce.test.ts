import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { generatePkce } from './pkce.js'

describe('pkce', () => {
  it('generates a code_verifier and code_challenge', () => {
    const { code_verifier, code_challenge } = generatePkce()

    expect(code_verifier).toBeTruthy()
    expect(code_challenge).toBeTruthy()
    expect(code_verifier).not.toBe(code_challenge)
  })

  it('generates base64url-safe strings', () => {
    const { code_verifier, code_challenge } = generatePkce()

    // base64url characters: A-Z, a-z, 0-9, -, _
    const base64urlRegex = /^[A-Za-z0-9_-]+$/
    expect(code_verifier).toMatch(base64urlRegex)
    expect(code_challenge).toMatch(base64urlRegex)
  })

  it('produces correct S256 challenge from verifier', () => {
    const { code_verifier, code_challenge } = generatePkce()

    const expected = crypto.createHash('sha256').update(code_verifier).digest('base64url')

    expect(code_challenge).toBe(expected)
  })

  it('generates unique values on each call', () => {
    const a = generatePkce()
    const b = generatePkce()

    expect(a.code_verifier).not.toBe(b.code_verifier)
    expect(a.code_challenge).not.toBe(b.code_challenge)
  })
})
