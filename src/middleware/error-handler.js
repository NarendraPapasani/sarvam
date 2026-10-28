import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import env from '../config/env.js';

/**
 * Centralised Express error handler.
 * Maps Prisma, Zod, and generic errors to consistent JSON responses.
 * Never leaks stack traces, SQL, or credentials in production.
 */
export function errorHandler(err, req, res, _next) {
  // Structured dev log
  if (env.isDevelopment) {
    console.error(`[${req.requestId}] ERROR:`, err);
  }

  // --- Zod validation error ---
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      meta: { requestId: req.requestId },
    });
  }

  // --- Prisma known request error ---
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: `A record with that unique value already exists.`,
          },
          meta: { requestId: req.requestId },
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          error: {
            code: 'RECORD_NOT_FOUND',
            message: 'The requested record was not found.',
          },
          meta: { requestId: req.requestId },
        });
      default:
        break;
    }
  }

  // --- Prisma initialisation / connection error ---
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The database is currently unavailable.',
      },
      meta: { requestId: req.requestId },
    });
  }

  // --- Application errors with a statusCode property ---
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'APPLICATION_ERROR',
        message: err.message,
      },
      meta: { requestId: req.requestId },
    });
  }

  // --- Fallback: unexpected 500 ---
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isProduction
        ? 'An unexpected error occurred.'
        : err.message || 'An unexpected error occurred.',
    },
    meta: { requestId: req.requestId },
  });
}
