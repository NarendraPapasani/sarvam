import { errorResponse } from '../utils/api-response.js';

/**
 * Catch-all 404 handler — placed after all routes.
 */
export function notFoundHandler(req, res) {
  return errorResponse(res, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found.`, 404);
}
