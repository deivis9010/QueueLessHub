import type { AvailabilityInput } from '../../types/availability.types';

/**
 * Availability Fixtures
 * Datos de prueba para disponibilidad de doctores
 */

const availabilityFixtures: Record<string, AvailabilityInput> = {
  mondayMorning: {
    dayOfWeek: 1, // Monday
    startHour: '09:00',
    endHour: '12:00',
    duration: 30,
    active: true,
  },

  mondayAfternoon: {
    dayOfWeek: 1, // Monday
    startHour: '14:00',
    endHour: '18:00',
    duration: 30,
    active: true,
  },

  fullDay: {
    dayOfWeek: 2, // Tuesday
    startHour: '09:00',
    endHour: '17:00',
    duration: 30,
    active: true,
  },

  inactive: {
    dayOfWeek: 3, // Wednesday
    startHour: '09:00',
    endHour: '17:00',
    duration: 30,
    active: false,
  },

  longSlots: {
    dayOfWeek: 4, // Thursday
    startHour: '09:00',
    endHour: '17:00',
    duration: 60,
    active: true,
  },

  weekend: {
    dayOfWeek: 6, // Saturday
    startHour: '10:00',
    endHour: '14:00',
    duration: 30,
    active: true,
  },
};

export default availabilityFixtures;
