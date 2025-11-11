const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../../src/middlewares/authMiddleware');

describe('authMiddleware - expired token handling', () => {
  test('returns 401 with expiredAt ISO and code TOKEN_EXPIRED for expired token', async () => {
    const app = express();
    app.get('/protected', authMiddleware, (req, res) => res.json({ ok: true }));

    const secret = process.env.JWT_SECRET || 'fallback_secret_key';

    // Create a token with exp in the past
    const expiredPayload = {
      id: '507f1f77bcf86cd799439011',
      role: 'user',
      exp: Math.floor(Date.now() / 1000) - 10, // expired 10 seconds ago
    };
    const expiredToken = jwt.sign(expiredPayload, secret);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Token expirado');
    expect(res.body).toHaveProperty('code', 'TOKEN_EXPIRED');
    expect(res.body).toHaveProperty('expiredAt');
    expect(typeof res.body.expiredAt).toBe('string');
    const parsed = new Date(res.body.expiredAt);
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});
