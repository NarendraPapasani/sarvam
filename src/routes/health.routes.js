import { Router } from 'express';
import prisma from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/api-response.js';

const router = Router();

/**
 * GET /health — basic liveness check.
 */
router.get('/health', (_req, res) => {
  return successResponse(res, {
    service: 'myntra-delivery-voice-agent-backend',
    status: 'ok',
    version: '1.0.0',
  });
});

/**
 * GET /api/v1/health/ready — readiness check with DB connectivity.
 */
router.get('/api/v1/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return successResponse(res, {
      service: 'myntra-delivery-voice-agent-backend',
      status: 'ready',
      database: 'connected',
    });
  } catch {
    return errorResponse(res, 'DATABASE_UNAVAILABLE', 'PostgreSQL is not reachable.', 503);
  }
});

export default router;
