import { describe, it, expect } from 'vitest'
import { decodeJwt } from 'jose'
import { generateTestKeyPair, signTestToken } from './test-tokens.js'

describe('test-tokens', () => {
  describe('generateTestKeyPair', () => {
    it('generates a key pair with expected properties', async () => {
      const keyPair = await generateTestKeyPair()

      expect(keyPair.privateKey).toBeDefined()
      expect(keyPair.publicJwk).toBeDefined()
      expect(keyPair.publicJwk.kid).toBe('test-key-1')
      expect(keyPair.publicJwk.use).toBe('sig')
      expect(keyPair.publicJwk.alg).toBe('RS256')
    })
  })

  describe('signTestToken', () => {
    it('signs a JWT with default claims', async () => {
      const keyPair = await generateTestKeyPair()
      const token = await signTestToken(keyPair)

      const payload = decodeJwt(token)
      expect(payload.sub).toBe('1')
      expect(payload.email).toBe('test@example.com')
      expect(payload.username).toBe('testuser')
      expect(payload.display_name).toBe('Test User')
      expect(payload.role).toBe('student')
      expect(payload.plan).toBe('free')
      expect(payload.features).toEqual([])
      expect(payload.apps).toEqual(['writing-buddy'])
      expect(payload.iss).toBe('http://localhost:3000')
    })

    it('signs a JWT with custom claims', async () => {
      const keyPair = await generateTestKeyPair()
      const token = await signTestToken(keyPair, {
        sub: '42',
        email: 'emma@labf.app',
        displayName: 'Emma Wang',
        plan: 'bundle',
        features: ['writing'],
        issuer: 'https://hub.labf.app',
      })

      const payload = decodeJwt(token)
      expect(payload.sub).toBe('42')
      expect(payload.email).toBe('emma@labf.app')
      expect(payload.display_name).toBe('Emma Wang')
      expect(payload.plan).toBe('bundle')
      expect(payload.features).toEqual(['writing'])
      expect(payload.iss).toBe('https://hub.labf.app')
    })

    it('uses custom expiration', async () => {
      const keyPair = await generateTestKeyPair()
      const token = await signTestToken(keyPair, { expiresInSeconds: 60 })

      const payload = decodeJwt(token)
      const iat = payload.iat as number
      const exp = payload.exp as number
      expect(exp - iat).toBe(60)
    })
  })
})
