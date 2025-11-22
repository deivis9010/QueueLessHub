# 📋 Testing Guide - QueueLessHub

## 🎯 Configuración de Pruebas

Este proyecto usa **Jest** y **Supertest** para pruebas de API con una base de datos MongoDB en memoria.

### 📦 Dependencias de Testing
- **jest**: Framework de testing v30.2.0
- **supertest**: Testing de APIs HTTP
- **mongodb-memory-server**: Base de datos MongoDB en memoria para testing
- **@jest/globals**: Funciones globales de Jest

### 📁 Estructura de Archivos de Prueba

```
src/tests/
├── setup.js                     # Configuración global de testing
├── README.md                    # Esta guía completa
│
├── unit/                        # Tests unitarios e integración (347 tests)
│   ├── auth.test.js            # 26 tests: Auth endpoints + middleware
│   ├── user.test.js            # 27 tests: CRUD usuarios + permisos
│   ├── client.test.js          # 13 tests: CRUD clientes
│   ├── doctor.test.js          # 12 tests: CRUD doctores
│   ├── availability.test.js    # 13 tests: CRUD disponibilidad
│   ├── appointment.test.js     # 37 tests: CRUD + generación citas
│   ├── conversation.test.js    # 13 tests: CRUD conversaciones
│   ├── bot.controller.test.js  # 11 tests: Controlador bot
│   ├── bot.spreadsheet.test.js # 11 tests: Bot spreadsheet
│   ├── chatflow.test.js        # 12 tests: Helpers chatflow
│   ├── chatflow.spreadsheet.test.js # 10 tests: Helpers chatflow spreadsheet
│   ├── dbErrorHandler.test.js  # 9 tests: Middleware errores DB
│   └── debug.test.js           # 1 test: Debug JWT
│
├── integration/                 # Tests de integración específicos (64 tests)
│   ├── helpers/
│   │   └── testSetup.js        # Setup para MongoDB in-memory
│   ├── chatflow.integration.test.js            # 34 tests
│   └── chatflow.spreadsheet.integration.test.js # 30 tests
│
└── e2e/                         # Tests end-to-end (futuros)
    └── helpers/
```

**Total: 347 tests pasando** ✅

## 🚀 Comandos de Testing

### Ejecutar todas las pruebas
```bash
npm test                         # Ejecuta todos los tests (347)
npm test -- --verbose           # Con output detallado
```

### Ejecutar pruebas con cobertura (coverage)
```bash
npm run test:coverage           # Cobertura completa (91.21% statements)
npm run test:unit:coverage      # Solo tests unitarios
npm run test:integration:coverage # Solo tests integración
```

### Ejecutar pruebas por tipo
```bash
npm run test:unit               # Tests unitarios (195 tests)
npm run test:integration        # Tests integración (64 tests)
npm run test:e2e                # Tests E2E (futuros)
```

### Ejecutar pruebas específicas
```bash
npm test auth.test.js                           # Solo tests de auth
npm test appointment                            # Todos los tests que contienen "appointment"
npm test -- --testNamePattern="should create"  # Tests que coincidan con el patrón
npm test -- --watch                            # Modo watch para desarrollo
npm test -- --bail                             # Detener al primer fallo
```

### Ejecutar tests de un módulo específico
```bash
npm test -- auth                # Auth tests (26 tests)
npm test -- user                # User tests (27 tests)
npm test -- appointment         # Appointment tests (37 tests)
npm test -- chatflow            # Chatflow tests (76 tests)
npm test -- bot                 # Bot tests (22 tests)
```

## 🧪 Qué se Prueba

### 1. 🔐 Autenticación (`auth.test.js` - 26 tests)
- ✅ **Endpoints de Auth** (7 tests)
  - Registro de usuarios con/sin campos requeridos
  - Login con credenciales válidas/inválidas
  - Manejo de usuarios duplicados
- ✅ **Middleware de Autenticación** (18 tests)
  - Validación de tokens JWT
  - Manejo de tokens expirados con código TOKEN_EXPIRED
  - Middleware de roles (admin, user, doctor)
  - Middleware roleOrSelfMiddleware para acceso propio
- ✅ **Token Expiration** (1 test)
  - Respuesta 401 con ISO timestamp de expiración

### 2. 👥 Usuarios (`user.test.js` - 27 tests)
- ✅ **CRUD Completo con Permisos**
  - POST: Crear usuarios (solo admin)
  - GET: Listar todos (solo admin) y obtener propio
  - GET/:id: Acceso propio o como admin
  - PUT: Actualizar propio o como admin
  - DELETE: Eliminar usuarios (solo admin)
- ✅ **Cambio de Contraseña** (3 tests)
  - Cambio exitoso con contraseña actual
  - Validación de contraseña actual incorrecta
  - Validación sin autenticación
- ✅ **Validaciones**
  - Campos requeridos, usuarios duplicados
  - Permisos admin vs usuario regular
  - IDs inválidos (400) vs no existentes (404)

### 3. 👨‍⚕️ Doctores (`doctor.test.js` - 12 tests)
- ✅ Creación con relación a usuarios
- ✅ Población automática de datos de usuario
- ✅ CRUD completo con autenticación
- ✅ Validación de campos requeridos
- ✅ Manejo de errores 404 y 500

### 4. 📞 Clientes (`client.test.js` - 13 tests)
- ✅ Creación con validación de teléfono único
- ✅ CRUD completo con autenticación obligatoria
- ✅ Manejo de duplicación de teléfonos
- ✅ Validación de IDs inválidos

### 5. 📅 Disponibilidad (`availability.test.js` - 13 tests)
- ✅ Creación de horarios de disponibilidad
- ✅ Validación de días de la semana (0-6)
- ✅ Relación con doctores y población
- ✅ CRUD completo con autenticación

### 6. 🗓️ Citas (`appointment.test.js` - 37 tests)
- ✅ **CRUD Básico** (13 tests)
  - Crear, listar, obtener, actualizar, eliminar
  - Validaciones de campos y autenticación
- ✅ **Generación de Citas** (4 tests)
  - Generar citas desde disponibilidad para N semanas
  - Validar slots de tiempo y disponibilidad activa
- ✅ **Gestión de Citas Libres** (3 tests)
  - Obtener citas libres por doctor
  - Cancelación automática de citas pasadas
- ✅ **Funciones de Servicio** (17 tests)
  - getNextConfirmedAppointment: Próxima cita del cliente
  - cancelConfirmedAppointment: Cancelar próxima cita
  - getAllConfirmedAppointmentsForClient: Todas las citas confirmadas
  - getFreeAppointmentsForDoctorAndDate: Citas libres por fecha
  - generateAppointmentsFromAvailability: Generar slots múltiples
  - getAvailabilityById: Helper de disponibilidad

### 7. 💬 Conversaciones (`conversation.test.js` - 13 tests)
- ✅ CRUD completo de conversaciones
- ✅ Estados y pasos de conversación
- ✅ Relación con clientes
- ✅ Búsqueda de conversaciones activas

### 8. 🤖 Bot Controllers (22 tests)
- ✅ **bot.controller.test.js** (11 tests)
  - Verificación de webhook
  - Procesamiento de mensajes de texto
  - Mensajes interactivos (buttons, lists)
  - Manejo de errores de API
- ✅ **bot.spreadsheet.test.js** (11 tests)
  - Verificación de webhook con token
  - Procesamiento de diferentes tipos de mensajes
  - Integración con Google Spreadsheet

### 9. 💬 ChatFlow Services (76 tests)
- ✅ **chatflow.test.js** (12 tests)
  - Helper functions: createTextMessage, createReplyButtonsMessage, createListMessage
  - Validación de estructura de mensajes WhatsApp
- ✅ **chatflow.spreadsheet.test.js** (10 tests)
  - Helpers para mensajes spreadsheet
  - Estructura de payloads WhatsApp Business API
- ✅ **chatflow.integration.test.js** (34 tests)
  - Flujo completo de agendamiento de citas
  - Selección de doctores y slots disponibles
  - Verificación de status y cancelación
  - Manejo de errores y timeouts (10 min)
  - Info de doctores con availability
- ✅ **chatflow.spreadsheet.integration.test.js** (30 tests)
  - Flujo completo de captura de datos
  - Validación de nombre, seguro, número, fecha
  - Manejo de estados y reinicio
  - Integración con Google Spreadsheet

### 10. 🔧 Middleware (`dbErrorHandler.test.js` - 9 tests)
- ✅ Manejo de ValidationError de Mongoose
- ✅ Manejo de CastError (IDs inválidos)
- ✅ Manejo de errores de clave duplicada (11000/11001)
- ✅ Pass-through de errores no relacionados con DB

### 11. 🐛 Debug (`debug.test.js` - 1 test)
- ✅ Verificación de generación y uso de tokens JWT

## ✨ Características del Sistema de Testing

### 🗄️ Base de Datos en Memoria
- ✅ Cada test usa una base de datos MongoDB limpia
- ✅ No requiere MongoDB instalado localmente
- ✅ Limpieza automática entre tests (beforeEach/afterEach)
- ✅ Aislamiento completo entre test suites
- ✅ Velocidad: Tests rápidos sin I/O de red

### 🔐 Autenticación en Tests
- ✅ Creación automática de usuarios de prueba
- ✅ Tokens JWT para pruebas autenticadas
- ✅ Diferentes roles (admin, user, doctor)
- ✅ Helpers para login rápido
- ✅ Tests de permisos y autorización

### ✅ Validación Completa
- ✅ Status codes HTTP correctos (200, 201, 400, 401, 403, 404, 500)
- ✅ Estructura de respuestas JSON
- ✅ Población de referencias entre modelos (populate)
- ✅ Manejo de errores de validación Mongoose
- ✅ Manejo de errores de duplicación MongoDB
- ✅ Manejo de IDs inválidos (CastError)

### 📊 Cobertura de Código Actual

```bash
npm run test:coverage  # Ver reporte completo
```

**Resultados de Coverage:**
- **Statements:** 91.21% (934/1024) ⬆️
- **Branches:** 79.15% (319/403) ⬆️
- **Functions:** 94.95% (113/119) ⬆️
- **Lines:** 91% (848/956) ⬆️

**Cobertura Detallada por Módulo:**

| Módulo | Statements | Branches | Functions | Lines | Estado |
|--------|------------|----------|-----------|-------|--------|
| **Models** | 100% | 100% | 100% | 100% | ✅ Completo |
| **Routes** | 100% | 100% | 100% | 100% | ✅ Completo |
| **appointment.service.js** | 100% | 100% | 100% | 100% | ✅ Completo |
| **auth.service.js** | 100% | 100% | 100% | 100% | ✅ Completo |
| **availability.service.js** | 100% | 100% | 100% | 100% | ✅ Completo |
| **client.service.js** | 100% | 100% | 100% | 100% | ✅ Completo |
| **conversation.service.js** | 100% | 100% | 100% | 100% | ✅ Completo |
| **doctor.service.js** | 100% | 100% | 100% | 100% | ✅ Completo |
| **user.service.js** | 100% | 100% | 100% | 100% | ✅ Completo |
| **authMiddleware.js** | 100% | 100% | 100% | 100% | ✅ Completo |
| **dbErrorHandler.js** | 86.66% | 83.33% | 100% | 86.66% | ✅ Bueno |
| **chatflow.service.js** | 80.55% | 55.03% | 72.72% | 80.95% | ⚠️ Mejorable |
| **chatflow.spreadsheet.service.js** | 92.92% | 84.31% | 100% | 92.78% | ✅ Bueno |
| **Controllers** | 89.52% | 88.7% | 100% | 89.49% | ✅ Bueno |

**Logros de Cobertura:**
- ✅ Todos los servicios principales al 100%
- ✅ Todos los modelos al 100%
- ✅ Todas las rutas al 100%
- ✅ Middleware de autenticación al 100%
- ✅ Cobertura general superior al 90%

## 📝 Estructura de un Test Típico

### Test de Integración Completo
```javascript
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Model = require('../models/model.model');

describe('Feature - Complete Test Suite', () => {
  let authToken, userId;
  
  beforeEach(async () => {
    // Setup: Limpiar DB y crear usuario admin
    await Model.deleteMany({});
    
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testadmin', password: 'pass123', role: 'admin' });
    
    userId = userResponse.body.user.id;
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'pass123' });
    
    authToken = loginResponse.body.token;
  });

  describe('POST /api/endpoint', () => {
    it('should create resource successfully', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Resource', value: 100 })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Resource');
      expect(response.body.value).toBe(100);
      
      // Verificar en DB
      const dbResource = await Model.findById(response.body.id);
      expect(dbResource).toBeTruthy();
      expect(dbResource.name).toBe('Test Resource');
    });
    
    it('should fail without authentication', async () => {
      await request(app)
        .post('/api/endpoint')
        .send({ name: 'Test' })
        .expect(401);
    });
    
    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ value: 100 })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

### Test Unitario de Servicio
```javascript
const Service = require('../services/service');
const Model = require('../models/model.model');

jest.mock('../models/model.model');

describe('Service - Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should return resource when found', async () => {
      const mockResource = { _id: '123', name: 'Test' };
      Model.findById.mockResolvedValue(mockResource);

      const result = await Service.getById('123');

      expect(result).toEqual(mockResource);
      expect(Model.findById).toHaveBeenCalledWith('123');
    });

    it('should return null when not found', async () => {
      Model.findById.mockResolvedValue(null);

      const result = await Service.getById('456');

      expect(result).toBeNull();
    });
  });
});
```

## 🎯 Mejores Prácticas

### 1. 🔒 Tests Aislados
- Cada test es completamente independiente
- No depender de orden de ejecución
- Limpiar datos antes/después de cada test
- Usar `beforeEach` y `afterEach`

### 2. 📦 Datos de Prueba
- Crear datos frescos en cada test
- Usar nombres únicos (timestamps, random)
- No reutilizar datos entre tests
- Limpiar después de cada test

### 3. 🧹 Limpieza Automática
```javascript
beforeEach(async () => {
  await Model.deleteMany({}); // Limpiar colección
});

afterAll(async () => {
  await mongoose.connection.close(); // Cerrar conexión
});
```

### 4. 📛 Nombres Descriptivos
```javascript
// ✅ Bueno: Descriptivo y claro
it('should return 404 when user does not exist', async () => {});

// ❌ Malo: Vago y poco claro
it('test user', async () => {});
```

### 5. 🎭 Casos Edge y Errores
- Probar casos felices (happy path)
- Probar validaciones y errores
- Probar límites y valores extremos
- Probar casos de autorización

### 6. 🔐 Autenticación en Tests
```javascript
// Probar CON autenticación
it('should succeed with auth', async () => {
  await request(app)
    .get('/api/protected')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
});

// Probar SIN autenticación
it('should fail without auth', async () => {
  await request(app)
    .get('/api/protected')
    .expect(401);
});

// Probar con PERMISOS INSUFICIENTES
it('should fail without admin role', async () => {
  await request(app)
    .delete('/api/users/123')
    .set('Authorization', `Bearer ${userToken}`)
    .expect(403);
});
```

### 7. 📊 Usar Expects Adecuados
```javascript
// Verificar propiedades
expect(response.body).toHaveProperty('id');
expect(response.body).toHaveProperty('createdAt');

// Verificar tipos
expect(typeof response.body.id).toBe('string');
expect(Array.isArray(response.body.items)).toBe(true);

// Verificar valores específicos
expect(response.body.status).toBe('active');
expect(response.body.count).toBeGreaterThan(0);

// Verificar objetos completos
expect(response.body).toMatchObject({
  name: 'Test',
  active: true
});
```

## 🐛 Debugging Tests

### Ver output detallado
```bash
npm test -- --verbose              # Mostrar todos los tests
npm test -- --verbose --no-coverage # Sin coverage (más rápido)
```

### Ejecutar un test específico
```bash
npm test -- --testNamePattern="should create a new client"
npm test -- -t "should create"     # Forma corta
```

### Ejecutar un archivo específico
```bash
npm test auth.test.js              # Solo tests de auth
npm test -- appointment            # Tests que contengan "appointment"
```

### Debug con logs en tests
```javascript
it('debug test', async () => {
  const response = await request(app).get('/api/endpoint');
  
  console.log('Status:', response.status);
  console.log('Body:', JSON.stringify(response.body, null, 2));
  console.log('Headers:', response.headers);
  
  expect(response.status).toBe(200);
});
```

### Debug con Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
# Abrir chrome://inspect en Chrome
```

### Ver solo tests que fallan
```bash
npm test -- --onlyFailures       # Solo ejecutar tests fallidos
npm test -- --bail               # Detener al primer fallo
```

### Tests en modo watch (desarrollo)
```bash
npm test -- --watch              # Re-ejecutar al cambiar archivos
npm test -- --watchAll          # Re-ejecutar todos los tests
```

## 📈 Métricas de Calidad

### Tests por Módulo
| Módulo | # Tests | Cobertura | Estado |
|--------|---------|-----------|--------|
| Auth | 26 | 100% | ✅ |
| User | 27 | 100% | ✅ |
| Appointment | 37 | 100% | ✅ |
| ChatFlow | 76 | 80-92% | ⚠️ |
| Bot | 22 | 100% | ✅ |
| Doctor | 12 | 100% | ✅ |
| Client | 13 | 100% | ✅ |
| Availability | 13 | 100% | ✅ |
| Conversation | 13 | 100% | ✅ |
| Middleware | 10 | 93% | ✅ |

**Total: 347 tests pasando** ✅

### Tiempo de Ejecución
- Tests unitarios: ~5-10 segundos
- Tests integración: ~15-20 segundos
- Suite completa: ~25-30 segundos
- Con coverage: ~40-50 segundos

## 🚀 Agregar Nuevos Tests

### 1. Crear archivo de test
```bash
# Para tests unitarios
touch src/tests/unit/myfeature.test.js

# Para tests de integración
touch src/tests/integration/myfeature.integration.test.js
```

### 2. Estructura básica
```javascript
const request = require('supertest');
const app = require('../../app');

describe('MyFeature Tests', () => {
  beforeEach(async () => {
    // Setup
  });

  afterEach(async () => {
    // Cleanup
  });

  describe('Feature A', () => {
    it('should do something', async () => {
      // Test implementation
    });
  });
});
```

### 3. Ejecutar el nuevo test
```bash
npm test myfeature
```

## 📚 Recursos Adicionales

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Testing Best Practices](https://testingjavascript.com/)