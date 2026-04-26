import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

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

const app = express();

if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

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
    contentSecurityPolicy: false,
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

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }: { req: Request; key: string }) => {
        console.warn(
          `[SANITIZE] Potential NoSQL injection attempt detected in ${req.method} ${req.url} - Key: ${key}`
        );
      },
    })
  );
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
app.use('/api/bot', webhookLimiter, skipCsrf, botRoutes);
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
