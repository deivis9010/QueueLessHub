import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

const app = express();

// Configure trust proxy BEFORE importing rate limiting middlewares
// This is critical for ngrok and reverse proxy environments
if (
  process.env.NODE_ENV === 'production' ||
  process.env.TRUST_PROXY === 'true' ||
  process.env.NODE_ENV === 'development'
) {
  app.set('trust proxy', 1);
}

// Import routes and middlewares AFTER configuring trust proxy
import botRoutes from './routes/bot.routes';
import botSpreadsheetRoutes from './routes/bot.spreadsheet.routes';
import appointmentRoutes from './routes/appointment.routes';
import clientRoutes from './routes/client.routes';
import conversationRoutes from './routes/conversation.routes';
import doctorRoutes from './routes/doctor.routes';
import availabilityRoutes from './routes/availability.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import swaggerSpec from './swagger';
import { generalLimiter, authLimiter, webhookLimiter } from './middlewares/rateLimit.middleware';
import {
  generateCsrfTokenMiddleware,
  validateCsrfToken,
  skipCsrf,
} from './middlewares/csrfProtection';
import dbErrorHandler from './middlewares/dbErrorHandler';

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void
  ) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((value) => value.trim())
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4200'];

    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }

    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400,
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameguard: {
      action: 'deny',
    },
    hidePoweredBy: true,
    ieNoOpen: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  })
);

// Swagger UI at /api-docs needs inline scripts and styles, so it overrides the strict API CSP set above.
const docsCsp = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'],
    fontSrc: ["'self'", 'data:'],
  },
});
app.use('/api-docs', docsCsp);

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Sanitization middleware - skip for webhook routes that use dots in query params
if (process.env.NODE_ENV !== 'test') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip mongoSanitize for webhook routes that use dots in query parameters
    if (req.path.includes('/api/bot/webhook')) {
      return next();
    }
    // Apply mongoSanitize for all other routes
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }: { req: Request; key: string }) => {
        console.warn(
          `[SANITIZE] Potential NoSQL injection attempt detected in ${req.method} ${req.url} - Key: ${key}`
        );
      },
    })(req, res, next);
  });
}

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Generate CSRF token for every request
app.use(generateCsrfTokenMiddleware);

app.use('/api/', generalLimiter);
// CSRF validation middleware - skip in test mode for compatibility
const csrfValidationMiddleware =
  process.env.NODE_ENV === 'test'
    ? (req: Request, res: Response, next: NextFunction) => next()
    : validateCsrfToken;

app.use('/api/bot/spreadsheet', webhookLimiter, skipCsrf, botSpreadsheetRoutes);
app.use('/api/bot', skipCsrf, botRoutes);
app.use('/api/appointments', csrfValidationMiddleware, appointmentRoutes);
app.use('/api/clients', csrfValidationMiddleware, clientRoutes);
app.use('/api/conversations', csrfValidationMiddleware, conversationRoutes);
app.use('/api/doctors', csrfValidationMiddleware, doctorRoutes);
app.use('/api/availability', csrfValidationMiddleware, availabilityRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', csrfValidationMiddleware, userRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api', (req: Request, res: Response) => {
  res.send('Bienvenido a la API de QueueLessHub');
});
app.get('/', (req: Request, res: Response) => {
  res.send('Bienvenido a la API de QueueLessHub');
});

app.use(dbErrorHandler);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
  next();
});

export default app;
