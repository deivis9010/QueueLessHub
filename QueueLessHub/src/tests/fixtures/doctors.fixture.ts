import type { DoctorInput } from '../../types/doctor.types';

/**
 * Doctor Fixtures
 * Datos de prueba para doctores
 */

const doctorFixtures: Record<string, DoctorInput> = {
  cardiology: {
    name: 'Dr. Juan Pérez',
    specialty: 'Cardiología',
    phone: '+1234567890',
  },

  neurology: {
    name: 'Dra. María García',
    specialty: 'Neurología',
    phone: '+1234567891',
  },

  pediatrics: {
    name: 'Dr. Carlos López',
    specialty: 'Pediatría',
    phone: '+1234567892',
  },

  general: {
    name: 'Dr. Test',
    specialty: 'Test Specialty',
    phone: '+9876543210',
  },

  // Compatibilidad con código antiguo que usa 'speciality'
  withSpeciality: {
    name: 'Dr. Legacy',
    specialty: 'Test Speciality',
    phone: '+1111111111',
  },
};

export default doctorFixtures;
