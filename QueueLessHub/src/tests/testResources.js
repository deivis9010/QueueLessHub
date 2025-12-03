/**
 * Test Resources Index
 * Punto de entrada único para fixtures, factories y helpers
 */

const fixtures = require('./fixtures');
const factories = require('./factories');
const helpers = require('./helpers/testHelpers');

module.exports = {
  // Fixtures (datos estáticos)
  fixtures,
  
  // Factories (generadores de datos)
  ...factories,
  
  // Helpers (funciones auxiliares)
  ...helpers
};
