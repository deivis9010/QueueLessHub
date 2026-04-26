/**
 * Test Resources Index
 * Punto de entrada único para fixtures, factories y helpers
 */

import * as fixtures from './fixtures';
import {
  userFactory,
  doctorFactory,
  clientFactory,
  availabilityFactory,
  appointmentFactory,
  conversationFactory,
} from './factories';
import * as helpers from './helpers/testHelpers';

export {
  fixtures,
  userFactory,
  doctorFactory,
  clientFactory,
  availabilityFactory,
  appointmentFactory,
  conversationFactory,
  helpers,
};
