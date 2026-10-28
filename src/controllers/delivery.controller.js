import * as deliveryService from '../services/delivery.service.js';
import { orderNumberParam } from '../schemas/order.schema.js';
import { createDeliveryEventSchema, updateEventStatusSchema, eventNumberParam } from '../schemas/delivery.schema.js';
import { successResponse, errorResponse } from '../utils/api-response.js';

/**
 * GET /api/v1/orders/:orderNumber/delivery-events
 */
export async function getDeliveryEvents(req, res, next) {
  try {
    const { orderNumber } = orderNumberParam.parse(req.params);
    const events = await deliveryService.getDeliveryEvents(orderNumber);

    if (events === null) {
      return errorResponse(res, 'ORDER_NOT_FOUND', 'Order not found.', 404);
    }

    return successResponse(res, events);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/orders/:orderNumber/delivery-events
 */
export async function createDeliveryEvent(req, res, next) {
  try {
    const { orderNumber } = orderNumberParam.parse(req.params);
    const body = createDeliveryEventSchema.parse(req.body);

    const result = await deliveryService.createDeliveryEvent(orderNumber, body);

    if (result.error) {
      return errorResponse(res, result.error, result.message, result.status);
    }

    return successResponse(res, result, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/delivery-events/:eventNumber
 */
export async function getDeliveryEvent(req, res, next) {
  try {
    const { eventNumber } = eventNumberParam.parse(req.params);
    const event = await deliveryService.getDeliveryEventByNumber(eventNumber);

    if (!event) {
      return errorResponse(res, 'EVENT_NOT_FOUND', 'Delivery event not found.', 404);
    }

    return successResponse(res, event);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/delivery-events/:eventNumber/status
 */
export async function updateDeliveryEventStatus(req, res, next) {
  try {
    const { eventNumber } = eventNumberParam.parse(req.params);
    const { status, resolutionNotes } = updateEventStatusSchema.parse(req.body);

    const result = await deliveryService.updateDeliveryEventStatus(eventNumber, status, resolutionNotes);

    if (result.error) {
      return errorResponse(res, result.error, result.message, result.status);
    }

    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
}
