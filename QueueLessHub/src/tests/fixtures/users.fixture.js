/**
 * User Fixtures
 * Datos de prueba para usuarios del sistema
 */

const userFixtures = {
  admin: {
    username: 'admin',
    password: 'password123',
    role: 'admin',
    email: 'admin@example.com'
  },

  regularUser: {
    username: 'testuser',
    password: 'password123',
    role: 'user',
    email: 'testuser@example.com'
  },

  doctor: {
    username: 'testdoctor',
    password: 'password123',
    role: 'doctor',
    email: 'testdoctor@example.com'
  },

  // Usuario sin email (para tests de compatibilidad)
  userWithoutEmail: {
    username: 'nomail',
    password: 'password123',
    role: 'user'
  }
};

module.exports = userFixtures;
