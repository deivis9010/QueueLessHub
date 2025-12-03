/**
 * Client Fixtures
 * Datos de prueba para clientes
 */

const clientFixtures = {
  active: {
    name: 'Juan Pérez',
    phone: '+1234567890',
    status: 'active'
  },

  inactive: {
    name: 'María García',
    phone: '+1234567891',
    status: 'inactive'
  },

  pending: {
    name: 'Carlos López',
    phone: '+1234567892',
    status: 'pending'
  },

  testClient: {
    name: 'Test Client',
    phone: '+9876543210',
    status: 'active'
  },

  // Cliente para tests de WhatsApp/Bot
  whatsapp: {
    name: '+testuser123',
    phone: '+testuser123',
    status: 'active'
  }
};

module.exports = clientFixtures;
