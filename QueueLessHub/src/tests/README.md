# Testing Guide

## Configuración de Pruebas

Este proyecto usa **Jest** y **Supertest** para pruebas de API con una base de datos MongoDB en memoria.

### Dependencias de Testing
- `jest`: Framework de testing
- `supertest`: Testing de APIs HTTP
- `mongodb-memory-server`: Base de datos MongoDB en memoria para testing

### Estructura de Archivos de Prueba

```
src/tests/
├── setup.js              # Configuración global de testing
├── auth.test.js          # Pruebas de autenticación
├── user.test.js          # Pruebas de usuarios
├── client.test.js        # Pruebas de clientes
├── doctor.test.js        # Pruebas de doctores
├── availability.test.js  # Pruebas de disponibilidad
├── appointment.test.js   # Pruebas de citas
└── conversation.test.js  # Pruebas de conversaciones
```

## Comandos de Testing

### Ejecutar todas las pruebas
```bash
npm test
```

### Ejecutar pruebas en modo watch (desarrollo)
```bash
npm run test:watch
```

### Ejecutar pruebas con reporte de cobertura
```bash
npm run test:coverage
```

### Ejecutar pruebas específicas
```bash
# Ejecutar solo pruebas de autenticación
npm test auth.test.js

# Ejecutar solo pruebas de clientes
npm test client.test.js

# Ejecutar pruebas que coincidan con un patrón
npm test -- --testNamePattern="should create"
```

## Qué se Prueba

### 1. Autenticación (`auth.test.js`)
- ✅ Registro de usuarios
- ✅ Login con credenciales válidas/inválidas
- ✅ Validación de campos requeridos
- ✅ Manejo de usuarios duplicados

### 2. Usuarios (`user.test.js`)
- ✅ CRUD completo de usuarios
- ✅ Permisos de admin vs usuario regular
- ✅ Actualización de contraseñas
- ✅ Validación de roles y permisos

### 3. Clientes (`client.test.js`)
- ✅ Creación de clientes
- ✅ Validación de unicidad de teléfono
- ✅ CRUD completo con autenticación
- ✅ Manejo de errores de duplicación

### 4. Doctores (`doctor.test.js`)
- ✅ Creación con relación a usuarios
- ✅ Población de datos de usuario
- ✅ CRUD completo
- ✅ Validación de campos requeridos

### 5. Disponibilidad (`availability.test.js`)
- ✅ Creación de horarios de disponibilidad
- ✅ Validación de días de la semana (0-6)
- ✅ Relación con doctores
- ✅ CRUD completo con población

### 6. Citas (`appointment.test.js`)
- ✅ Creación de citas con relaciones complejas
- ✅ Población de cliente y disponibilidad->doctor
- ✅ Búsqueda de próxima cita confirmada
- ✅ Cancelación de citas
- ✅ Validación de referencias

### 7. Conversaciones (`conversation.test.js`)
- ✅ Manejo de flujos de conversación
- ✅ Estados y pasos de conversación
- ✅ Mensajes de chat
- ✅ Búsqueda de conversaciones activas

## Características del Sistema de Testing

### Base de Datos en Memoria
- ✅ Cada test usa una base de datos MongoDB limpia
- ✅ No requiere MongoDB instalado localmente
- ✅ Limpieza automática entre tests

### Autenticación en Tests
- ✅ Creación automática de usuarios de prueba
- ✅ Tokens JWT para pruebas autenticadas
- ✅ Diferentes roles (admin, user, doctor)

### Validación Completa
- ✅ Status codes HTTP correctos
- ✅ Estructura de respuestas JSON
- ✅ Población de referencias entre modelos
- ✅ Manejo de errores de validación y duplicación

### Cobertura de Código
```bash
npm run test:coverage
```
Genera un reporte de cobertura en la carpeta `coverage/`

## Estructura de un Test Típico

```javascript
describe('Endpoint Group', () => {
  let authToken;
  
  beforeEach(async () => {
    // Setup: crear usuario y obtener token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({ username: 'test', password: 'pass', role: 'admin' });
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'pass' });
    
    authToken = loginResponse.body.token;
  });

  test('should do something successfully', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ data: 'test' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.data).toBe('test');
  });
});
```

## Mejores Prácticas

1. **Tests Aislados**: Cada test es independiente
2. **Datos de Prueba**: Crear datos frescos en cada test
3. **Limpieza**: Base de datos se limpia automáticamente
4. **Nombres Descriptivos**: Tests describen claramente qué validan
5. **Casos Edge**: Incluir casos de error y validación
6. **Autenticación**: Probar endpoints con y sin autenticación

## Debugging Tests

### Ver output detallado
```bash
npm test -- --verbose
```

### Ejecutar solo un test específico
```bash
npm test -- --testNamePattern="should create a new client"
```

### Debug con logs
```javascript
test('debug test', async () => {
  const response = await request(app).get('/api/endpoint');
  console.log('Response:', response.body);
  // ... rest of test
});
```