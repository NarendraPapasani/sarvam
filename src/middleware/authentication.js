import env from '../config/env.js';
import { errorResponse } from '../utils/api-response.js';

/**
 * Simple API-secret authentication middleware.
 * Checks the `x-api-secret` header against the configured API_SECRET.
 *
 * NOTE: In a production system this would use JWT, OAuth2, or another
 * robust authentication mechanism. A shared secret is sufficient for
 * this hackathon/demo backend but must NOT be used in production.
 */
export function authenticate(req, res, next) {
  const secret = req.headers['x-api-secret'];

  if (!secret) {
    return errorResponse(res, 'AUTH_REQUIRED', 'Authentication is required. Provide x-api-secret header.', 401);
  }

  if (secret !== env.API_SECRET) {
    return errorResponse(res, 'AUTH_INVALID', 'Invalid API secret.', 403);
  }

  next();
}
