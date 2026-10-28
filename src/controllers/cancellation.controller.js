import * as cancellationService from '../services/cancellation.service.js';
import { orderNumberParam } from '../schemas/order.schema.js';
import { cancellationRequestSchema, rescheduleRequestSchema } from '../schemas/cancellation.schema.js';
import { successResponse, errorResponse } from '../utils/api-response.js';

/**
 * POST /api/v1/orders/:orderNumber/cancellation-requests
 */
export async function requestCancellation(req, res, next) {
  try {
    const { orderNumber } = orderNumberParam.parse(req.params);
    const body = cancellationRequestSchema.parse(req.body);

    const result = await cancellationService.requestCancellation(orderNumber, body);

    if (result.error) {
      return errorResponse(res, result.error, result.message, result.status);
    }

    return successResponse(res, result, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/orders/:orderNumber/cancellation-requests
 */
export async function getCancellationRequests(req, res, next) {
  try {
    const { orderNumber } = orderNumberParam.parse(req.params);
    const events = await cancellationService.getCancellationRequests(orderNumber);

    if (events === null) {
      return errorResponse(res, 'ORDER_NOT_FOUND', 'Order not found.', 404);
    }

    return successResponse(res, events);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/orders/:orderNumber/reschedule-requests
 */
export async function requestReschedule(req, res, next) {
  try {
    const { orderNumber } = orderNumberParam.parse(req.params);
    const body = rescheduleRequestSchema.parse(req.body);

    const result = await cancellationService.requestReschedule(orderNumber, body);

    if (result.error) {
      return errorResponse(res, result.error, result.message, result.status);
    }

    return successResponse(res, result, 201);
  } catch (err) {
    next(err);
  }
}
