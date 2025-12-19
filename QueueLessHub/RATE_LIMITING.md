# Rate Limiting - Documentación

## ¿Qué es Rate Limiting?

El **rate limiting** es una técnica de seguridad que limita el número de solicitudes que una IP puede hacer a tu API en un período de tiempo específico. Esto protege tu aplicación contra:

- ✅ Ataques de fuerza bruta
- ✅ Spam y abuso de recursos
- ✅ Costos excesivos de base de datos
- ✅ Degradación del rendimiento
- ✅ Ataques DDoS

## Implementación en QueueLessHub

Se han implementado **6 tipos de rate limiters** en este proyecto:

### 1. General Limiter
- **Aplicado a**: Toda la API (`/api/*`)
- **Límite**: 100 solicitudes por 15 minutos por IP
- **Propósito**: Protección general contra abuso

### 2. Auth Limiter
- **Aplicado a**: `/api/auth/*`
- **Límite**: 5 intentos por 15 minutos por IP
- **Propósito**: Prevenir ataques de fuerza bruta en login/registro
- **Característica especial**: No cuenta las solicitudes exitosas (200-299)

### 3. Webhook Limiter
- **Aplicado a**: `/api/bot/*` y `/api/bot/spreadsheet/*`
- **Límite**: 30 mensajes por minuto por IP
- **Propósito**: Controlar flujo de mensajes de WhatsApp

### 4. Appointment Creation Limiter
- **Aplicado a**: `POST /api/appointments`
- **Límite**: 10 citas por hora por IP
- **Propósito**: Prevenir spam en creación de citas

### 5. Write Limiter
- **Aplicado a**: Operaciones POST, PUT, DELETE en:
  - `/api/appointments/:id` (PUT)
  - `/api/clients/*` (POST, PUT, DELETE)
- **Límite**: 20 operaciones por 15 minutos
- **Propósito**: Limitar operaciones de escritura costosas

### 6. Read Limiter
- **Uso**: Disponible para aplicar en endpoints GET si es necesario
- **Límite**: 50 consultas por 5 minutos
- **Propósito**: Controlar lecturas excesivas

## Respuestas del Rate Limiter

Cuando se excede un límite, la API responde con:

```json
{
  "error": "Demasiadas solicitudes desde esta IP",
  "message": "Has excedido el límite de solicitudes. Por favor intenta de nuevo más tarde.",
  "retryAfter": "15 minutos"
}
```

**Status HTTP**: `429 Too Many Requests`

**Headers de respuesta**:
```
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1640000000
```

## Configuración

Los valores por defecto están en el código, pero puedes personalizarlos via variables de entorno en `.env`:

```env
# General API Rate Limit
RATE_LIMIT_WINDOW_MS=900000           # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100           # 100 solicitudes

# Auth Rate Limit
RATE_LIMIT_AUTH_WINDOW_MS=900000      # 15 minutos
RATE_LIMIT_AUTH_MAX=5                 # 5 intentos

# Appointment Creation Rate Limit
RATE_LIMIT_APPOINTMENT_WINDOW_MS=3600000  # 1 hora
RATE_LIMIT_APPOINTMENT_MAX=10         # 10 citas

# Webhook Rate Limit
RATE_LIMIT_WEBHOOK_WINDOW_MS=60000    # 1 minuto
RATE_LIMIT_WEBHOOK_MAX=30             # 30 mensajes

# Write Operations Rate Limit
RATE_LIMIT_WRITE_WINDOW_MS=900000     # 15 minutos
RATE_LIMIT_WRITE_MAX=20               # 20 operaciones

# Read Operations Rate Limit
RATE_LIMIT_READ_WINDOW_MS=300000      # 5 minutos
RATE_LIMIT_READ_MAX=50                # 50 consultas
```

## Testing

Para probar el rate limiting:

```bash
# Hacer múltiples solicitudes rápidas
for i in {1..10}; do
  curl http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

Después de 5 intentos, recibirás un error `429`.

## Monitoreo

Los logs del sistema registran cuando se alcanzan los límites:

```
[RATE LIMIT] Intentos excesivos de autenticación desde IP: 192.168.1.1
[RATE LIMIT] Operaciones de escritura excesivas desde IP: 192.168.1.1
```

## Mejoras Futuras

### Almacenamiento en MongoDB
Para producción con múltiples instancias, considera usar `rate-limit-mongo`:

```javascript
const MongoStore = require('rate-limit-mongo');

const limiter = rateLimit({
  store: new MongoStore({
    uri: process.env.MONGODB_URI,
    collectionName: 'rateLimits'
  })
});
```

### Rate Limiting por Usuario
Para usuarios autenticados, puedes usar el `userId` en lugar de la IP:

```javascript
const limiter = rateLimit({
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});
```

### Whitelist de IPs
Para servicios confiables:

```javascript
const limiter = rateLimit({
  skip: (req) => {
    const trustedIps = ['127.0.0.1', '10.0.0.1'];
    return trustedIps.includes(req.ip);
  }
});
```

## Archivos Modificados

1. **Nuevo**: `src/middlewares/rateLimit.middleware.js` - Configuración de limiters
2. **Modificado**: `src/app.js` - Aplicación de limiters generales
3. **Modificado**: `src/routes/appointment.routes.js` - Limiter de citas
4. **Modificado**: `src/routes/client.routes.js` - Limiter de escritura
5. **Modificado**: `.env.example` - Variables de configuración

## Referencias

- [express-rate-limit Documentation](https://github.com/express-rate-limit/express-rate-limit)
- [OWASP Rate Limiting Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
