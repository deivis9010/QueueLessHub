import type { UserRegisterInput } from '../../types/user.types';

/**
 * User Fixtures
 * Datos de prueba para usuarios del sistema
 */

const userFixtures: Record<string, UserRegisterInput> = {
  admin: {
    username: 'admin',
    password: 'Str0ng!Pass123',
    role: 'admin',
    email: 'admin@example.com',
  },

  regularUser: {
    username: 'testuser',
    password: 'Str0ng!Pass123',
    role: 'user',
    email: 'testuser@example.com',
  },

  doctor: {
    username: 'testdoctor',
    password: 'Str0ng!Pass123',
    role: 'doctor',
    email: 'testdoctor@example.com',
  },

  // Usuario sin email (para tests de compatibilidad)
  userWithoutEmail: {
    username: 'nomail',
    password: 'Str0ng!Pass123',
    role: 'user',
  },
};

export default userFixtures;
