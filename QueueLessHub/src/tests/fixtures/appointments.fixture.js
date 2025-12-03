/**
 * Appointment Fixtures
 * Datos de prueba para citas
 */

const appointmentFixtures = {
  scheduled: {
    date: new Date('2025-12-15T10:00:00.000Z'),
    hour: '10:00',
    notes: 'Regular checkup',
    status: 'scheduled',
    confirmed: false,
    free: false
  },

  confirmed: {
    date: new Date('2025-12-16T14:00:00.000Z'),
    hour: '14:00',
    notes: 'Follow-up appointment',
    status: 'scheduled',
    confirmed: true,
    free: false
  },

  cancelled: {
    date: new Date('2025-12-17T09:00:00.000Z'),
    hour: '09:00',
    notes: 'Patient cancelled',
    status: 'cancelled',
    confirmed: false,
    free: true
  },

  completed: {
    date: new Date('2025-12-10T11:00:00.000Z'),
    hour: '11:00',
    notes: 'Completed visit',
    status: 'completed',
    confirmed: true,
    free: false
  },

  available: {
    date: new Date('2025-12-20T10:00:00.000Z'),
    hour: '10:00',
    notes: null,
    status: 'available',
    confirmed: false,
    free: true
  },

  // Para tests de slots
  morningSlot: {
    date: new Date('2025-12-15T09:00:00.000Z'),
    hour: '09:00',
    status: 'available',
    confirmed: false,
    free: true
  },

  afternoonSlot: {
    date: new Date('2025-12-15T15:00:00.000Z'),
    hour: '15:00',
    status: 'available',
    confirmed: false,
    free: true
  }
};

module.exports = appointmentFixtures;
