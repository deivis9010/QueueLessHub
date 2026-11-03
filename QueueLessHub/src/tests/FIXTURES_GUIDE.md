# Fixtures, Factories y Helpers para Tests

Este directorio contiene recursos reutilizables para facilitar la escritura y mantenimiento de tests.

## 📁 Estructura

```
tests/
├── fixtures/           # Datos estáticos predefinidos
├── factories/          # Generadores de datos dinámicos
├── helpers/            # Funciones auxiliares
└── examples/           # Ejemplos de uso
```

## 🎯 Fixtures

Los **fixtures** son datos estáticos predefinidos que se pueden reutilizar en múltiples tests.

### Uso de Fixtures

```typescript
const fixtures = require('../fixtures');

// Usar datos de usuario predefinidos
const adminData = fixtures.users.admin;
const doctorData = fixtures.doctors.cardiology;
const clientData = fixtures.clients.active;
```

### Fixtures Disponibles

#### `fixtures.users`
- `admin` - Usuario administrador
- `regularUser` - Usuario regular
- `doctor` - Usuario con rol de doctor
- `userWithoutEmail` - Usuario sin email

#### `fixtures.doctors`
- `cardiology` - Doctor cardiólogo
- `neurology` - Doctor neurólogo
- `pediatrics` - Doctor pediatra
- `general` - Doctor general para tests

#### `fixtures.clients`
- `active` - Cliente activo
- `inactive` - Cliente inactivo
- `pending` - Cliente pendiente
- `testClient` - Cliente para tests generales
- `whatsapp` - Cliente para tests de bot

#### `fixtures.availabilities`
- `mondayMorning` - Disponibilidad lunes por la mañana
- `mondayAfternoon` - Disponibilidad lunes por la tarde
- `fullDay` - Día completo
- `inactive` - Disponibilidad inactiva
- `longSlots` - Slots de 60 minutos
- `weekend` - Disponibilidad fin de semana

#### `fixtures.appointments`
- `scheduled` - Cita programada
- `confirmed` - Cita confirmada
- `cancelled` - Cita cancelada
- `completed` - Cita completada
- `available` - Slot disponible

## 🏭 Factories

Los **factories** generan datos dinámicos con valores únicos, ideales para evitar colisiones en tests.

### Uso de Factories

```typescript
const { userFactory, doctorFactory, clientFactory } = require('../factories');

// Generar datos únicos
const userData = userFactory.create();
const adminData = userFactory.createAdmin();
const doctorData = doctorFactory.create(userId);

// Generar múltiples registros
const users = userFactory.createMany(5);
const doctors = doctorFactory.createMany(userId, 3);
```

### Factories Disponibles

#### `userFactory`
- `create(overrides)` - Crea datos de usuario único
- `createAdmin(overrides)` - Crea admin con datos únicos
- `createDoctor(overrides)` - Crea doctor con datos únicos
- `createMany(count, overrides)` - Crea múltiples usuarios

#### `doctorFactory`
- `create(userId, overrides)` - Crea datos de doctor
- `withSpecialty(userId, specialty, overrides)` - Doctor con especialidad específica
- `createMany(userId, count, overrides)` - Múltiples doctores

#### `clientFactory`
- `create(overrides)` - Crea datos de cliente
- `withPhone(phone, overrides)` - Cliente con teléfono específico
- `createMany(count, overrides)` - Múltiples clientes

#### `availabilityFactory`
- `create(doctorId, overrides)` - Crea disponibilidad
- `forDay(doctorId, dayOfWeek, overrides)` - Para día específico
- `weekSchedule(doctorId, overrides)` - Horario semanal completo

#### `appointmentFactory`
- `create(clientId, availabilityId, overrides)` - Crea cita
- `confirmed(clientId, availabilityId, overrides)` - Cita confirmada
- `available(availabilityId, overrides)` - Slot disponible
- `createMany(clientId, availabilityId, count, overrides)` - Múltiples citas

#### `conversationFactory`
- `create(clientId, overrides)` - Crea conversación
- `atStep(clientId, step, overrides)` - Conversación en paso específico

## 🛠️ Helpers

Los **helpers** son funciones auxiliares que simplifican tareas comunes en tests.

### Auth Helpers

Facilitan la autenticación en tests:

```typescript
const { authHelpers } = require('../helpers/testHelpers');

// Crear y autenticar usuarios
const admin = await authHelpers.createAdmin();
const user = await authHelpers.createUser();
const doctor = await authHelpers.createDoctor();

// Usar el token
const response = await request(app)
  .get('/api/users')
  .set('Authorization', `Bearer ${admin.token}`);
```

### Request Helpers

Simplifican requests HTTP con autenticación:

```typescript
const { requestHelpers } = require('../helpers/testHelpers');

// Requests autenticados
await requestHelpers.authenticatedGet('/api/users', token);
await requestHelpers.authenticatedPost('/api/users', token, userData);
await requestHelpers.authenticatedPut(`/api/users/${id}`, token, updateData);
await requestHelpers.authenticatedDelete(`/api/users/${id}`, token);
```

### Model Helpers

Crean datos directamente en la base de datos:

```typescript
const { modelHelpers } = require('../helpers/testHelpers');

// Crear registros directamente
const clientId = await modelHelpers.createClient(Client, clientData);
const doctorId = await modelHelpers.createDoctor(Doctor, doctorData);
const availabilityId = await modelHelpers.createAvailability(Availability, availData);
```

### Assertion Helpers

Verificaciones comunes de estructura de datos:

```typescript
const { assertionHelpers } = require('../helpers/testHelpers');

// Verificar estructura de respuestas
assertionHelpers.expectUserShape(response.body, expectedData);
assertionHelpers.expectDoctorShape(doctor, expectedData);
assertionHelpers.expectClientShape(client, expectedData);
assertionHelpers.expectAppointmentShape(appointment, expectedData);
assertionHelpers.expectErrorResponse(response, 400);
```

### Wait Helpers

Manejo de tiempo en tests:

```typescript
const { waitHelpers } = require('../helpers/testHelpers');

// Esperar tiempo específico
await waitHelpers.wait(1000);

// Generar fechas
const futureDate = waitHelpers.futureDate(7); // 7 días adelante
const pastDate = waitHelpers.pastDate(7); // 7 días atrás
```

## 📝 Ejemplo Completo

```typescript
const request = require('supertest');
const app = require('../../app');
const fixtures = require('../fixtures');
const { userFactory, doctorFactory } = require('../factories');
const { authHelpers, assertionHelpers } = require('../helpers/testHelpers');

describe('Doctor Tests with Fixtures', () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    // Usar helper para autenticación
    const admin = await authHelpers.createAdmin();
    authToken = admin.token;
    userId = admin.userId;
  });

  it('should create doctor with fixture data', async () => {
    // Usar fixture para datos conocidos
    const doctorData = {
      ...fixtures.doctors.cardiology,
      user: userId
    };

    const response = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(doctorData)
      .expect(201);

    // Usar assertion helper
    assertionHelpers.expectDoctorShape(response.body, doctorData);
  });

  it('should create doctor with factory data', async () => {
    // Usar factory para datos únicos
    const doctorData = doctorFactory.create(userId, {
      specialty: 'Cardiology'
    });

    const response = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(doctorData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.specialty).toBe('Cardiology');
  });

  it('should create multiple doctors', async () => {
    // Usar factory para múltiples registros
    const doctors = doctorFactory.createMany(userId, 3);

    for (const doctorData of doctors) {
      await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${authToken}`)
        .send(doctorData)
        .expect(201);
    }

    const response = await request(app)
      .get('/api/doctors')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(3);
  });
});
```

## 🎨 Mejores Prácticas

### ✅ Cuándo usar Fixtures
- Datos conocidos y predecibles
- Escenarios específicos que se repiten
- Datos de referencia estándar
- Tests que requieren valores exactos

### ✅ Cuándo usar Factories
- Necesitas datos únicos para evitar colisiones
- Tests que corren en paralelo
- Múltiples registros con datos similares
- Datos dinámicos con timestamps

### ✅ Cuándo usar Helpers
- Tareas repetitivas de autenticación
- Verificaciones de estructura comunes
- Creación de datos de setup
- Assertions personalizadas

## 🔄 Migración de Tests Existentes

Para migrar un test existente:

1. **Identifica datos repetidos**: Busca objetos de datos que se repiten
2. **Crea fixtures si son estáticos**: Si los datos son siempre iguales
3. **Usa factories si son dinámicos**: Si necesitas valores únicos
4. **Extrae lógica común a helpers**: Como autenticación y setup
5. **Simplifica assertions**: Usa assertion helpers para verificaciones comunes

### Antes:
```typescript
beforeEach(async () => {
  const adminResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'admin',
      password: 'password123',
      role: 'admin'
    });

  const adminLoginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'password123'
    });

  adminToken = adminLoginResponse.body.token;
});
```

### Después:
```typescript
beforeEach(async () => {
  const admin = await authHelpers.createAdmin();
  adminToken = admin.token;
});
```

## 📚 Recursos Adicionales

- Ver `examples/user.refactored.example.ts` para un ejemplo completo
- Todos los fixtures están en `fixtures/`
- Todas las factories están en `factories/`
- Todos los helpers están en `helpers/`

## 🤝 Contribuir

Al agregar nuevos tests:

1. Revisa si puedes usar fixtures/factories existentes
2. Si necesitas nuevos datos, agrégalos a los fixtures apropiados
3. Si necesitas generadores dinámicos, extiende las factories
4. Si repites lógica, considera crear un helper
5. Documenta nuevos helpers complejos
