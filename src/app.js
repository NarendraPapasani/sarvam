import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';

// Routes
import healthRoutes from './routes/health.routes.js';
import customerRoutes from './routes/customer.routes.js';
import orderRoutes from './routes/order.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import escalationRoutes from './routes/escalation.routes.js';
import demoRoutes from './routes/demo.routes.js';

const app = express();

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-secret', 'x-request-id'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);

// ─── Request logging (development) ──────────────────────────────────────────
if (env.isDevelopment) {
  app.use((req, _res, next) => {
    console.log(`[${req.requestId}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use(healthRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/delivery-events', deliveryRoutes);
app.use('/api/v1/escalations', escalationRoutes);
app.use('/api/v1/demo', demoRoutes);

// ─── Error Handling ─────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
