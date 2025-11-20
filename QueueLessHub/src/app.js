const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();

const botRoutes = require('./routes/bot.routes');
const botSpreadsheetRoutes = require('./routes/bot.spreadsheet.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const clientRoutes = require('./routes/client.routes');
const conversationRoutes = require('./routes/conversation.routes');
const doctorRoutes = require('./routes/doctor.routes');
const availabilityRoutes = require('./routes/availability.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

// Configuración de seguridad con Helmet
app.use(helmet({
  contentSecurityPolicy: false, // API REST no sirve HTML
  crossOriginEmbedderPolicy: false // Permitir webhooks de WhatsApp
}));

app.use(cors());
app.use(express.json());

// Middleware de logs
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/bot/spreadsheet', botSpreadsheetRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// Swagger UI - documentación de la API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api', (req, res) => {
  res.send('Bienvenido a la API de QueueLessHub');
});
app.get('/', (req, res) => {
  res.send('Bienvenido a la API de QueueLessHub');
});

// Middleware de manejo de errores
// DB / Mongoose error handler (returns 400/409 for common DB errors)
const dbErrorHandler = require('./middlewares/dbErrorHandler');
app.use(dbErrorHandler);

// Fallback generic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
