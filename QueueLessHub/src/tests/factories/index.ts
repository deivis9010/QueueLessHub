import { randomUUID } from 'crypto';

import type { UserRegisterInput } from '../../types/user.types';
import type { DoctorInput } from '../../types/doctor.types';
import type { ClientInput } from '../../types/client.types';
import type { AvailabilityInput } from '../../types/availability.types';
import type { AppointmentInput } from '../../types/appointment.types';
import type { ConversationInput } from '../../types/conversation.types';

/**
 * Factory Functions
 * Funciones para crear datos de prueba dinámicos con valores únicos
 */

/**
 * Genera un timestamp único para evitar colisiones en tests paralelos
 */
const uniqueTimestamp = (): string => Date.now() + randomUUID().replace(/-/g, '').slice(0, 12);

/**
 * User Factory
 */
const userFactory = {
  /**
   * Crea datos para un nuevo usuario
   */
  create(overrides: Partial<UserRegisterInput> = {}): UserRegisterInput {
    const timestamp = uniqueTimestamp();
    return {
      username: `user_${timestamp}`,
      password: 'Str0ng!Pass123',
      role: 'user',
      email: `user_${timestamp}@example.com`,
      ...overrides,
    };
  },

  /**
   * Crea un usuario admin
   */
  createAdmin(overrides: Partial<UserRegisterInput> = {}): UserRegisterInput {
    return this.create({ role: 'admin', ...overrides });
  },

  /**
   * Crea un usuario doctor
   */
  createDoctor(overrides: Partial<UserRegisterInput> = {}): UserRegisterInput {
    return this.create({ role: 'doctor', ...overrides });
  },

  /**
   * Crea múltiples usuarios
   */
  createMany(count: number, overrides: Partial<UserRegisterInput> = {}): UserRegisterInput[] {
    return Array.from({ length: count }, () => this.create(overrides));
  },
};

/**
 * Doctor Factory
 */
const doctorFactory = {
  /**
   * Crea datos para un nuevo doctor
   */
  create(userId?: string, overrides: Partial<DoctorInput> = {}): DoctorInput {
    const timestamp = uniqueTimestamp();
    return {
      name: `Dr. Test ${timestamp}`,
      specialty: 'General Medicine',
      phone: `+${timestamp.substring(0, 12)}`,
      user: userId,
      ...overrides,
    };
  },

  /**
   * Crea un doctor con especialidad específica
   */
  withSpecialty(
    userId: string,
    specialty: string,
    overrides: Partial<DoctorInput> = {}
  ): DoctorInput {
    return this.create(userId, { specialty, ...overrides });
  },

  /**
   * Crea múltiples doctores
   */
  createMany(userId: string, count: number, overrides: Partial<DoctorInput> = {}): DoctorInput[] {
    return Array.from({ length: count }, (_, i) =>
      this.create(userId, { name: `Dr. Test ${i}`, ...overrides })
    );
  },
};

/**
 * Client Factory
 */
const clientFactory = {
  /**
   * Crea datos para un nuevo cliente
   */
  create(overrides: Partial<ClientInput> = {}): ClientInput {
    const timestamp = uniqueTimestamp();
    return {
      name: `Client ${timestamp}`,
      phone: `+${timestamp.substring(0, 12)}`,
      status: 'active',
      ...overrides,
    };
  },

  /**
   * Crea un cliente con teléfono específico
   */
  withPhone(phone: string, overrides: Partial<ClientInput> = {}): ClientInput {
    return this.create({ phone, ...overrides });
  },

  /**
   * Crea múltiples clientes
   */
  createMany(count: number, overrides: Partial<ClientInput> = {}): ClientInput[] {
    return Array.from({ length: count }, (_, i) =>
      this.create({ name: `Client ${i}`, ...overrides })
    );
  },
};

/**
 * Availability Factory
 */
const availabilityFactory = {
  /**
   * Crea datos para disponibilidad
   */
  create(doctorId?: string, overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
    return {
      doctor: doctorId,
      dayOfWeek: 1, // Monday
      startHour: '09:00',
      endHour: '17:00',
      duration: 30,
      active: true,
      ...overrides,
    };
  },

  /**
   * Crea disponibilidad para un día específico
   */
  forDay(
    doctorId: string,
    dayOfWeek: number,
    overrides: Partial<AvailabilityInput> = {}
  ): AvailabilityInput {
    return this.create(doctorId, { dayOfWeek, ...overrides });
  },

  /**
   * Crea disponibilidad para toda la semana
   */
  weekSchedule(doctorId: string, overrides: Partial<AvailabilityInput> = {}): AvailabilityInput[] {
    return Array.from({ length: 5 }, (_, i) =>
      this.create(doctorId, { dayOfWeek: i + 1, ...overrides })
    );
  },
};

/**
 * Appointment Factory
 */
const appointmentFactory = {
  /**
   * Crea datos para una cita
   */
  create(
    clientId: string | null,
    availabilityId: string,
    overrides: Partial<AppointmentInput> = {}
  ): AppointmentInput {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 días en el futuro

    return {
      client: clientId || undefined,
      availability: availabilityId,
      date: futureDate,
      hour: '10:00',
      notes: 'Test appointment',
      status: 'scheduled',
      confirmed: false,
      free: false,
      ...overrides,
    };
  },

  /**
   * Crea una cita confirmada
   */
  confirmed(
    clientId: string,
    availabilityId: string,
    overrides: Partial<AppointmentInput> = {}
  ): AppointmentInput {
    return this.create(clientId, availabilityId, { confirmed: true, ...overrides });
  },

  /**
   * Crea una cita disponible (sin asignar)
   */
  available(availabilityId: string, overrides: Partial<AppointmentInput> = {}): AppointmentInput {
    return this.create(null, availabilityId, {
      client: null,
      status: 'available',
      free: true,
      confirmed: false,
      notes: null,
      ...overrides,
    });
  },

  /**
   * Crea múltiples citas
   */
  createMany(
    clientId: string | null,
    availabilityId: string,
    count: number,
    overrides: Partial<AppointmentInput> = {}
  ): AppointmentInput[] {
    return Array.from({ length: count }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      return this.create(clientId, availabilityId, { date, ...overrides });
    });
  },
};

/**
 * Conversation Factory (para tests de bot)
 */
const conversationFactory = {
  /**
   * Crea datos para una conversación
   */
  create(clientId: string | null, overrides: Partial<ConversationInput> = {}): ConversationInput {
    return {
      client: clientId || undefined,
      currentStep: 'start',
      messages: [],
      ...overrides,
    };
  },

  /**
   * Crea una conversación en un paso específico
   */
  atStep(
    clientId: string,
    step: string,
    overrides: Partial<ConversationInput> = {}
  ): ConversationInput {
    return this.create(clientId, { currentStep: step, ...overrides });
  },
};

export {
  userFactory,
  doctorFactory,
  clientFactory,
  availabilityFactory,
  appointmentFactory,
  conversationFactory,
};
