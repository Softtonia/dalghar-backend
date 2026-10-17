import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = (): Application => {
  const app: Application = express();

  // Security HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Robust CORS setup accepting frontend origin & custom tenant headers
  const allowedOrigins = [
    config.clientUrl,
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:5174',
    'http://localhost:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman) or matching allowed origins
        if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Restaurant-Id', 'X-Branch-Id'],
    })
  );

  // Cookie parser
  app.use(cookieParser());

  // Body parser (allow large payloads for base64 logos and rich templates)
  app.use(express.json({ limit: '50mb' }));
  // Serve uploaded images statically
  const uploadsStaticPath = path.resolve(__dirname, '../public/uploads');
  app.use('/uploads', express.static(uploadsStaticPath));

  // API Routes
  app.use('/api', apiRouter);

  // 404 Handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
