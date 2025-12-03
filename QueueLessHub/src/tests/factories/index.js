/**
 * Factory Functions
 * Funciones para crear datos de prueba dinámicos con valores únicos
 */

/**
 * Genera un timestamp único para evitar colisiones en tests paralelos
 */
const uniqueTimestamp = () => Date.now() + Math.random().toString(36).substring(7);

/**
 * User Factory
 */
const userFactory = {
  /**
   * Crea datos para un nuevo usuario
   * @param {Object} overrides - Propiedades para sobrescribir
   * @returns {Object} Datos del usuario
   */
  create(overrides = {}) {
    const timestamp = uniqueTimestamp();
    return {
      username: `user_${timestamp}`,
      password: 'password123',
      role: 'user',
      email: `user_${timestamp}@example.com`,
      ...overrides
    };
  },

  /**
   * Crea un usuario admin
   */
  createAdmin(overrides = {}) {
    return this.create({ role: 'admin', ...overrides });
  },

  /**
   * Crea un usuario doctor
   */
  createDoctor(overrides = {}) {
    return this.create({ role: 'doctor', ...overrides });
  },

  /**
   * Crea múltiples usuarios
   * @param {number} count - Número de usuarios a crear
   * @param {Object} overrides - Propiedades para sobrescribir
   */
  createMany(count, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
};

/**
 * Doctor Factory
 */
const doctorFactory = {
  /**
   * Crea datos para un nuevo doctor
   * @param {string} userId - ID del usuario asociado
   * @param {Object} overrides - Propiedades para sobrescribir
   */
  create(userId, overrides = {}) {
    const timestamp = uniqueTimestamp();
    return {
      name: `Dr. Test ${timestamp}`,
      specialty: 'General Medicine',
      phone: `+${timestamp.substring(0, 12)}`,
      user: userId,
      ...overrides
    };
  },

  /**
   * Crea un doctor con especialidad específica
   */
  withSpecialty(userId, specialty, overrides = {}) {
    return this.create(userId, { specialty, ...overrides });
  },

  /**
   * Crea múltiples doctores
   */
  createMany(userId, count, overrides = {}) {
    return Array.from({ length: count }, (_, i) => 
      this.create(userId, { name: `Dr. Test ${i}`, ...overrides })
    );
  }
};

/**
 * Client Factory
 */
const clientFactory = {
  /**
   * Crea datos para un nuevo cliente
   * @param {Object} overrides - Propiedades para sobrescribir
   */
  create(overrides = {}) {
    const timestamp = uniqueTimestamp();
    return {
      name: `Client ${timestamp}`,
      phone: `+${timestamp.substring(0, 12)}`,
      status: 'active',
      ...overrides
    };
  },

  /**
   * Crea un cliente con teléfono específico
   */
  withPhone(phone, overrides = {}) {
    return this.create({ phone, ...overrides });
  },

  /**
   * Crea múltiples clientes
   */
  createMany(count, overrides = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({ name: `Client ${i}`, ...overrides })
    );
  }
};

/**
 * Availability Factory
 */
const availabilityFactory = {
  /**
   * Crea datos para disponibilidad
   * @param {string} doctorId - ID del doctor
   * @param {Object} overrides - Propiedades para sobrescribir
   */
  create(doctorId, overrides = {}) {
    return {
      doctor: doctorId,
      dayOfWeek: 1, // Monday
      startHour: '09:00',
      endHour: '17:00',
      duration: 30,
      active: true,
      ...overrides
    };
  },

  /**
   * Crea disponibilidad para un día específico
   */
  forDay(doctorId, dayOfWeek, overrides = {}) {
    return this.create(doctorId, { dayOfWeek, ...overrides });
  },

  /**
   * Crea disponibilidad para toda la semana
   */
  weekSchedule(doctorId, overrides = {}) {
    return Array.from({ length: 5 }, (_, i) =>
      this.create(doctorId, { dayOfWeek: i + 1, ...overrides })
    );
  }
};

/**
 * Appointment Factory
 */
const appointmentFactory = {
  /**
   * Crea datos para una cita
   * @param {string} clientId - ID del cliente
   * @param {string} availabilityId - ID de disponibilidad
   * @param {Object} overrides - Propiedades para sobrescribir
   */
  create(clientId, availabilityId, overrides = {}) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 días en el futuro

    return {
      client: clientId,
      availability: availabilityId,
      date: futureDate,
      hour: '10:00',
      notes: 'Test appointment',
      status: 'scheduled',
      confirmed: false,
      free: false,
      ...overrides
    };
  },

  /**
   * Crea una cita confirmada
   */
  confirmed(clientId, availabilityId, overrides = {}) {
    return this.create(clientId, availabilityId, { confirmed: true, ...overrides });
  },

  /**
   * Crea una cita disponible (sin asignar)
   */
  available(availabilityId, overrides = {}) {
    return this.create(null, availabilityId, {
      client: null,
      status: 'available',
      free: true,
      confirmed: false,
      notes: null,
      ...overrides
    });
  },

  /**
   * Crea múltiples citas
   */
  createMany(clientId, availabilityId, count, overrides = {}) {
    return Array.from({ length: count }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      return this.create(clientId, availabilityId, { date, ...overrides });
    });
  }
};

/**
 * Conversation Factory (para tests de bot)
 */
const conversationFactory = {
  /**
   * Crea datos para una conversación
   * @param {string} clientId - ID del cliente
   * @param {Object} overrides - Propiedades para sobrescribir
   */
  create(clientId, overrides = {}) {
    return {
      client: clientId,
      currentStep: 'start',
      messages: [],
      lastActivity: new Date(),
      ...overrides
    };
  },

  /**
   * Crea una conversación en un paso específico
   */
  atStep(clientId, step, overrides = {}) {
    return this.create(clientId, { currentStep: step, ...overrides });
  }
};

module.exports = {
  userFactory,
  doctorFactory,
  clientFactory,
  availabilityFactory,
  appointmentFactory,
  conversationFactory
};
