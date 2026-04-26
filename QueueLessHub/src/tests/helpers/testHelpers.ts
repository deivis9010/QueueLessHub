/**
 * Test Helpers
 * Funciones auxiliares para simplificar tests
 */

import request from 'supertest';
import app from '../../app';

/**
 * Auth Helpers
 * Funciones para manejar autenticación en tests
 */
const authHelpers = {
  /**
   * Registra y autentica un usuario, retorna cookies y usuario
   * @param {Object} userData - Datos del usuario a crear
   * @returns {Promise<{agent: Agent, userId: string, user: Object, accessToken: string}>}
   */
  async registerAndLogin(userData) {
    // Usar agent para persistencia de cookies
    const agent = request.agent(app);

    const registerResponse = await agent.post('/api/auth/register').send(userData);

    const loginResponse = await agent.post('/api/auth/login').send({
      username: userData.username,
      password: userData.password,
    });

    // Para backward compatibility, solicitar tokens en body para tests
    const tokenResponse = await agent.post('/api/auth/login').set('Accept-Cookie', 'false').send({
      username: userData.username,
      password: userData.password,
    });

    return {
      agent, // Agent que mantiene cookies de sesión
      token: tokenResponse.body.accessToken,
      refreshToken: tokenResponse.body.refreshToken,
      userId: registerResponse.body.user?.id || registerResponse.body.user?._id,
      user: registerResponse.body.user,
    };
  },

  /**
   * Crea un usuario admin autenticado
   */
  async createAdmin(overrides = {}) {
    const userData = {
      username: 'admin_' + Date.now(),
      password: 'Str0ng!Pass123',
      role: 'admin',
      ...overrides,
    };
    return this.registerAndLogin(userData);
  },

  /**
   * Crea un usuario regular autenticado
   */
  async createUser(overrides = {}) {
    const userData = {
      username: 'user_' + Date.now(),
      password: 'Str0ng!Pass123',
      role: 'user',
      ...overrides,
    };
    return this.registerAndLogin(userData);
  },

  /**
   * Crea un usuario doctor autenticado
   */
  async createDoctor(overrides = {}) {
    const userData = {
      username: 'doctor_' + Date.now(),
      password: 'Str0ng!Pass123',
      role: 'doctor',
      email: `doctor_${Date.now()}@example.com`,
      ...overrides,
    };
    return this.registerAndLogin(userData);
  },
};

/**
 * Request Helpers
 * Funciones para simplificar requests HTTP con autenticación
 */
const requestHelpers = {
  /**
   * Hace un GET request con autenticación
   */
  async authenticatedGet(url, token) {
    return request(app).get(url).set('Authorization', `Bearer ${token}`);
  },

  /**
   * Hace un POST request con autenticación
   */
  async authenticatedPost(url, token, data) {
    return request(app).post(url).set('Authorization', `Bearer ${token}`).send(data);
  },

  /**
   * Hace un PUT request con autenticación
   */
  async authenticatedPut(url, token, data) {
    return request(app).put(url).set('Authorization', `Bearer ${token}`).send(data);
  },

  /**
   * Hace un DELETE request con autenticación
   */
  async authenticatedDelete(url, token) {
    return request(app).delete(url).set('Authorization', `Bearer ${token}`);
  },
};

/**
 * Model Helpers
 * Funciones para crear datos directamente en modelos
 */
const modelHelpers = {
  /**
   * Crea un cliente directamente en la base de datos
   */
  async createClient(Client, data) {
    const client = await Client.create(data);
    return client._id.toString();
  },

  /**
   * Crea un doctor directamente en la base de datos
   */
  async createDoctor(Doctor, data) {
    const doctor = await Doctor.create(data);
    return doctor._id.toString();
  },

  /**
   * Crea disponibilidad directamente en la base de datos
   */
  async createAvailability(Availability, data) {
    const availability = await Availability.create(data);
    return availability._id.toString();
  },

  /**
   * Crea una cita directamente en la base de datos
   */
  async createAppointment(Appointment, data) {
    const appointment = await Appointment.create(data);
    return appointment._id.toString();
  },
};

/**
 * Assertion Helpers
 * Funciones para assertions comunes
 */
const assertionHelpers = {
  /**
   * Verifica que un objeto tiene los campos esperados de un usuario
   */
  expectUserShape(user, expectedData = {}) {
    expect(user).toHaveProperty('id');
    expect(user).not.toHaveProperty('password');
    if (expectedData.username) {
      expect(user.username).toBe(expectedData.username);
    }
    if (expectedData.role) {
      expect(user.role).toBe(expectedData.role);
    }
  },

  /**
   * Verifica que un objeto tiene los campos esperados de un doctor
   */
  expectDoctorShape(doctor, expectedData = {}) {
    expect(doctor).toHaveProperty('id');
    if (expectedData.name) {
      expect(doctor.name).toBe(expectedData.name);
    }
    if (expectedData.specialty || expectedData.speciality) {
      expect(doctor.specialty || doctor.speciality).toBe(
        expectedData.specialty || expectedData.speciality
      );
    }
  },

  /**
   * Verifica que un objeto tiene los campos esperados de un cliente
   */
  expectClientShape(client, expectedData = {}) {
    expect(client).toHaveProperty('id');
    if (expectedData.name) {
      expect(client.name).toBe(expectedData.name);
    }
    if (expectedData.phone) {
      expect(client.phone).toBe(expectedData.phone);
    }
  },

  /**
   * Verifica que un objeto tiene los campos esperados de una cita
   */
  expectAppointmentShape(appointment, expectedData = {}) {
    expect(appointment).toHaveProperty('id');
    if (expectedData.hour) {
      expect(appointment.hour).toBe(expectedData.hour);
    }
    if (expectedData.status) {
      expect(appointment.status).toBe(expectedData.status);
    }
  },

  /**
   * Verifica respuesta de error
   */
  expectErrorResponse(response, statusCode) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('error');
  },
};

/**
 * Wait Helpers
 * Funciones para manejo de tiempo en tests
 */
const waitHelpers = {
  /**
   * Espera un tiempo específico
   */
  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Crea una fecha en el futuro
   */
  futureDate(daysFromNow = 7) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  },

  /**
   * Crea una fecha en el pasado
   */
  pastDate(daysAgo = 7) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  },
};

module.exports = {
  authHelpers,
  requestHelpers,
  modelHelpers,
  assertionHelpers,
  waitHelpers,
};
