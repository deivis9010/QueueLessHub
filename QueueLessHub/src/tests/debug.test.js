const request = require('supertest');
const app = require('../app');

describe('Debug Auth', () => {
  it('debug token creation and verification', async () => {
    console.log('JWT_SECRET en tests:', process.env.JWT_SECRET);
    
    // Crear usuario
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'debuguser',
        password: 'password123',
        role: 'admin'
      });

    console.log('Register response:', registerResponse.body);

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'debuguser',
        password: 'password123'
      });

    console.log('Login response:', loginResponse.body);
    const token = loginResponse.body.token;
    console.log('Token generated:', token);

    // Test usando el token
    const protectedResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    console.log('Protected response status:', protectedResponse.status);
    console.log('Protected response body:', protectedResponse.body);
  });
});
