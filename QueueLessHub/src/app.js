const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
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
// Rate Limiting
const {
  generalLimiter,
  authLimiter,
  webhookLimiter
} = require('./middlewares/rateLimit.middleware');

// Trust proxy - Important for rate limiting and logging real IPs behind reverse proxies (Vercel, Heroku, AWS, etc.)
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1); // Trust first proxy
}

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4200']; // Default for development
    
    // Allow requests with no origin (mobile apps, Postman, curl, webhooks)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400 // Cache preflight requests for 24 hours
};

// Security configuration with Helmet
app.use(helmet({
  contentSecurityPolicy: false, // API REST doesn't serve HTML
  crossOriginEmbedderPolicy: false, // Allow WhatsApp webhooks
  
  // HSTS - Force HTTPS in production (recommended for production)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent browsers from guessing MIME type
  noSniff: true,
  
  // Prevent clickjacking attacks (deny is more restrictive than SAMEORIGIN)
  frameguard: {
    action: 'deny'
  },
  
  // Hide X-Powered-By header (don't reveal tech stack)
  hidePoweredBy: true,
  
  // Set X-Download-Options for IE8+
  ieNoOpen: true,
  
  // Referrer Policy - Control how much referrer information is shared
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

app.use(cors(corsOptions));
app.use(express.json());

// NoSQL Injection Protection - Sanitize user input
app.use(mongoSanitize({
  replaceWith: '_', // Replace prohibited characters with underscore
  onSanitize: ({ req, key }) => {
    console.warn(`[SANITIZE] Potential NoSQL injection attempt detected in ${req.method} ${req.url} - Key: ${key}`);
  }
}));

// Middleware de logs
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rate Limiting - Protección general para toda la API
app.use('/api/', generalLimiter);

// Rate Limiting específico para endpoints críticos
app.use('/api/bot/spreadsheet', webhookLimiter, botSpreadsheetRoutes);
app.use('/api/bot', webhookLimiter, botRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/auth', authLimiter, authRoutes);
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
