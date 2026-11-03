const request = require('supertest');
import app from '../../app';

describe('Debug Auth', () => {
  it('debug token creation and verification', async () => {
    // Crear usuario
    const registerResponse = await request(app).post('/api/auth/register').send({
      username: 'debuguser',
      password: 'Str0ng!Pass123',
      role: 'admin',
    });

    console.log('Register response:', registerResponse.body);

    // Login
    const loginResponse = await request(app).post('/api/auth/login').send({
      username: 'debuguser',
      password: 'Str0ng!Pass123',
    });

    console.log('Login response:', loginResponse.body);
    const token = loginResponse.body.accessToken;
    console.log('Token generated:', token);

    // Test usando el token
    const protectedResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    console.log('Protected response status:', protectedResponse.status);
    console.log('Protected response body:', protectedResponse.body);
  });
});
