import crypto from 'crypto';

/**
 * Attach a unique requestId (UUID) to every incoming request.
 * Downstream code uses `req.requestId` and the response envelope includes it.
 */
export function requestIdMiddleware(req, _res, next) {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  next();
}
