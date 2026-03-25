import { describe, it, expect } from 'vitest'
import { SignJWT, generateKeyPair } from 'jose'
import { decodeUser } from './jwt.js'

describe('jwt', () => {
  describe('decodeUser', () => {
    it('extracts user claims from a JWT', async () => {
      const { privateKey } = await generateKeyPair('RS256', { extractable: true })

      const token = await new SignJWT({
        sub: '42',
        username: 'emma',
        display_name: 'Emma Wang',
        email: 'emma@example.com',
        email_verified: true,
        role: 'student',
        plan: 'bundle',
        features: ['writing', 'vocab'],
        apps: ['vocab-master', 'writing-buddy'],
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer('https://hub.labf.app')
        .setAudience('test-client')
        .setExpirationTime('1h')
        .sign(privateKey)

      const user = decodeUser(token)

      expect(user.sub).toBe('42')
      expect(user.username).toBe('emma')
      expect(user.display_name).toBe('Emma Wang')
      expect(user.email).toBe('emma@example.com')
      expect(user.email_verified).toBe(true)
      expect(user.role).toBe('student')
      expect(user.plan).toBe('bundle')
      expect(user.features).toEqual(['writing', 'vocab'])
      expect(user.apps).toEqual(['vocab-master', 'writing-buddy'])
    })

    it('handles missing optional claims with defaults', async () => {
      const { privateKey } = await generateKeyPair('RS256', { extractable: true })

      const token = await new SignJWT({ sub: '1' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey)

      const user = decodeUser(token)

      expect(user.sub).toBe('1')
      expect(user.username).toBe('')
      expect(user.display_name).toBe('')
      expect(user.email).toBe('')
      expect(user.email_verified).toBe(false)
      expect(user.role).toBe('student')
      expect(user.plan).toBe('free')
      expect(user.features).toEqual([])
      expect(user.apps).toEqual([])
    })
  })
})
