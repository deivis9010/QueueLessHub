/**
 * Index de Fixtures
 * Exporta todos los fixtures en un solo lugar
 */

const users = require('./users.fixture');
const doctors = require('./doctors.fixture');
const clients = require('./clients.fixture');
const availabilities = require('./availabilities.fixture');
const appointments = require('./appointments.fixture');

module.exports = {
  users,
  doctors,
  clients,
  availabilities,
  appointments
};
