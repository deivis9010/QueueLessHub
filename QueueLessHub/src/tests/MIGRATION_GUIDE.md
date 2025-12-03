# 🔄 Guía de Migración a Fixtures y Factories

Esta guía te ayudará a migrar tests existentes para usar los nuevos fixtures, factories y helpers.

## 📦 Recursos Creados

### ✅ Fixtures (Datos Estáticos)
```
src/tests/fixtures/
├── index.js                  # Exporta todos
├── users.fixture.js          # 4 fixtures de usuarios
├── doctors.fixture.js        # 5 fixtures de doctores
├── clients.fixture.js        # 5 fixtures de clientes
├── availabilities.fixture.js # 6 fixtures de disponibilidad
└── appointments.fixture.js   # 7 fixtures de citas
```

### 🏭 Factories (Generadores Dinámicos)
```
src/tests/factories/
└── index.js                  # 6 factories completas
    ├── userFactory
    ├── doctorFactory
    ├── clientFactory
    ├── availabilityFactory
    ├── appointmentFactory
    └── conversationFactory
```

### 🛠️ Helpers (Funciones Auxiliares)
```
src/tests/helpers/
└── testHelpers.js
    ├── authHelpers          # Autenticación simplificada
    ├── requestHelpers       # Requests HTTP con auth
    ├── modelHelpers         # Creación directa en DB
    ├── assertionHelpers     # Verificaciones comunes
    └── waitHelpers          # Manejo de tiempo
```

### 📝 Documentación
- `FIXTURES_GUIDE.md` - Guía completa de uso
- `testResources.js` - Export unificado
- `examples/user.refactored.example.js` - Ejemplo completo

## 🚀 Inicio Rápido

### Importar Recursos

```javascript
// Opción 1: Importar todo desde un archivo
const { fixtures, userFactory, authHelpers } = require('../testResources');

// Opción 2: Importar selectivamente
const fixtures = require('../fixtures');
const { userFactory, doctorFactory } = require('../factories');
const { authHelpers, assertionHelpers } = require('../helpers/testHelpers');
```

## 📋 Pasos de Migración

### Paso 1: Identificar Datos Repetidos

**Antes:**
```javascript
beforeEach(async () => {
  const adminResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'admin',
      password: 'password123',
      role: 'admin'
    });
  // ... más código
});
```

**Después:**
```javascript
const { authHelpers } = require('../helpers/testHelpers');

beforeEach(async () => {
  const admin = await authHelpers.createAdmin();
  adminToken = admin.token;
});
```

### Paso 2: Usar Fixtures para Datos Conocidos

**Antes:**
```javascript
const doctorData = {
  name: 'Dr. Juan Pérez',
  specialty: 'Cardiología',
  phone: '+1234567890'
};
```

**Después:**
```javascript
const fixtures = require('../fixtures');
const doctorData = {
  ...fixtures.doctors.cardiology,
  user: userId
};
```

### Paso 3: Usar Factories para Datos Únicos

**Antes:**
```javascript
const userData = {
  username: 'testuser_' + Date.now(),
  password: 'password123',
  role: 'user'
};
```

**Después:**
```javascript
const { userFactory } = require('../factories');
const userData = userFactory.create();
```

### Paso 4: Simplificar Assertions

**Antes:**
```javascript
expect(response.body).toHaveProperty('id');
expect(response.body.username).toBe(userData.username);
expect(response.body.role).toBe(userData.role);
expect(response.body).not.toHaveProperty('password');
```

**Después:**
```javascript
const { assertionHelpers } = require('../helpers/testHelpers');
assertionHelpers.expectUserShape(response.body, userData);
```

## 🎯 Casos de Uso Comunes

### Caso 1: Test con Autenticación

**Antes (20 líneas):**
```javascript
describe('User Tests', () => {
  let authToken;

  beforeEach(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'password123',
        role: 'user'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  it('should get users', async () => {
    await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

**Después (8 líneas):**
```javascript
const { authHelpers, requestHelpers } = require('../helpers/testHelpers');

describe('User Tests', () => {
  let authToken;

  beforeEach(async () => {
    const user = await authHelpers.createUser();
    authToken = user.token;
  });

  it('should get users', async () => {
    await requestHelpers.authenticatedGet('/api/users', authToken)
      .expect(200);
  });
});
```

### Caso 2: Crear Múltiples Registros

**Antes:**
```javascript
beforeEach(async () => {
  await User.create({
    username: 'doctor1',
    password: 'hashedpassword',
    role: 'doctor'
  });
  await User.create({
    username: 'doctor2',
    password: 'hashedpassword',
    role: 'doctor'
  });
  await User.create({
    username: 'doctor3',
    password: 'hashedpassword',
    role: 'doctor'
  });
});
```

**Después:**
```javascript
const { userFactory } = require('../factories');

beforeEach(async () => {
  const doctors = userFactory.createMany(3, { role: 'doctor' });
  for (const doctor of doctors) {
    await User.create({ ...doctor, password: 'hashedpassword' });
  }
});
```

### Caso 3: Datos con Relaciones

**Antes:**
```javascript
it('should create appointment', async () => {
  const client = await Client.create({
    name: 'Test Client',
    phone: '+1234567890',
    status: 'active'
  });
  
  const doctor = await Doctor.create({
    name: 'Dr. Test',
    specialty: 'Cardiology',
    phone: '+9876543210',
    user: userId
  });

  const appointmentData = {
    client: client._id,
    availability: availabilityId,
    date: new Date('2025-12-15'),
    hour: '10:00',
    status: 'scheduled'
  };

  // ... test
});
```

**Después:**
```javascript
const { clientFactory, doctorFactory, appointmentFactory } = require('../factories');

it('should create appointment', async () => {
  const client = await Client.create(clientFactory.create());
  const doctor = await Doctor.create(doctorFactory.create(userId));
  
  const appointmentData = appointmentFactory.create(
    client._id,
    availabilityId
  );

  // ... test
});
```

## 🔍 Patrones de Migración

### Patrón 1: Setup Completo de Test

**Antes:**
```javascript
let authToken, userId, doctorId, clientId;

beforeEach(async () => {
  // 30+ líneas de setup
});
```

**Después:**
```javascript
const { authHelpers, modelHelpers } = require('../helpers/testHelpers');
const { doctorFactory, clientFactory } = require('../factories');

let authToken, userId, doctorId, clientId;

beforeEach(async () => {
  const admin = await authHelpers.createAdmin();
  authToken = admin.token;
  userId = admin.userId;
  
  doctorId = await modelHelpers.createDoctor(Doctor, doctorFactory.create(userId));
  clientId = await modelHelpers.createClient(Client, clientFactory.create());
});
```

### Patrón 2: Tests de Error

**Antes:**
```javascript
it('should return 404', async () => {
  const response = await request(app)
    .get('/api/users/invalid-id')
    .set('Authorization', `Bearer ${token}`)
    .expect(400);
  
  expect(response.body).toHaveProperty('error');
});
```

**Después:**
```javascript
const { requestHelpers, assertionHelpers } = require('../helpers/testHelpers');

it('should return 404', async () => {
  const response = await requestHelpers.authenticatedGet(
    '/api/users/invalid-id',
    token
  );
  
  assertionHelpers.expectErrorResponse(response, 400);
});
```

## 📊 Beneficios Medidos

### Reducción de Código
- **Setup de autenticación:** 20 líneas → 3 líneas (85% reducción)
- **Creación de datos:** 10 líneas → 1 línea (90% reducción)
- **Assertions:** 5 líneas → 1 línea (80% reducción)

### Mejora en Mantenibilidad
- ✅ Datos centralizados en fixtures
- ✅ Generadores reutilizables
- ✅ Helpers consistentes
- ✅ Menos código duplicado

## ⚠️ Consideraciones

### NO Migrar Si:
- El test es muy específico y único
- El setup es trivial (1-2 líneas)
- Ya funciona bien y no requiere cambios

### SI Migrar Si:
- El test tiene setup repetitivo
- Compartes datos con otros tests
- El test es difícil de mantener
- Quieres mejorar la legibilidad

## 🔄 Proceso de Migración Sugerido

1. **Fase 1:** Migrar tests nuevos
   - Usa fixtures/factories en todos los tests nuevos
   
2. **Fase 2:** Migrar tests problemáticos
   - Migra tests que son difíciles de mantener
   - Migra tests con mucho setup duplicado

3. **Fase 3:** Migración gradual
   - Migra tests cuando los edites
   - No hace falta migrar todo de una vez

## 📚 Recursos Adicionales

- Ver `FIXTURES_GUIDE.md` para documentación completa
- Ver `examples/user.refactored.example.js` para ejemplo real
- Consultar `testResources.js` para ver todas las exportaciones

## 🤝 Contribuir

Al agregar nuevos fixtures/factories:

1. Agrega a los archivos correspondientes en `fixtures/` o `factories/`
2. Actualiza `FIXTURES_GUIDE.md` si es necesario
3. Crea un ejemplo si el uso no es obvio
4. Asegúrate de que todos los tests sigan pasando

## ✅ Checklist de Migración

Para cada test que migres:

- [ ] Setup de autenticación usa `authHelpers`
- [ ] Datos estáticos usan `fixtures`
- [ ] Datos únicos usan `factories`
- [ ] Requests usan `requestHelpers`
- [ ] Assertions usan `assertionHelpers`
- [ ] Tests siguen pasando
- [ ] Código es más legible

## 🎓 Próximos Pasos

1. Lee `FIXTURES_GUIDE.md` para familiarizarte con los recursos
2. Revisa `examples/user.refactored.example.js` para ver el antes/después
3. Intenta migrar un test simple primero
4. Gradualmente adopta los patrones en tus tests

---

**¿Preguntas?** Consulta `FIXTURES_GUIDE.md` o revisa los ejemplos en `examples/`
