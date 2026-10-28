import * as orderService from '../services/order.service.js';
import * as deliveryService from '../services/delivery.service.js';
import { orderNumberParam, ordersQuerySchema } from '../schemas/order.schema.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';

/**
 * GET /api/v1/orders
 */
export async function listOrders(req, res, next) {
  try {
    const query = ordersQuerySchema.parse(req.query);
    const { orders, total } = await orderService.listOrders(query);
    return paginatedResponse(res, orders, query.page, query.limit, total);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/orders/:orderNumber
 */
export async function getOrder(req, res, next) {
  try {
    const { orderNumber } = orderNumberParam.parse(req.params);
    const order = await orderService.getOrderByNumber(orderNumber);

    if (!order) {
      return errorResponse(res, 'ORDER_NOT_FOUND', 'Order not found.', 404);
    }

    return successResponse(res, order);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/orders/:orderNumber/status
 */
export async function getOrderStatus(req, res, next) {
  try {
    const { orderNumber } = orderNumberParam.parse(req.params);
    const status = await orderService.getOrderStatus(orderNumber);

    if (!status) {
      return errorResponse(res, 'ORDER_NOT_FOUND', 'Order not found.', 404);
    }

    return successResponse(res, status);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/orders/:orderNumber/delivery-options
 */
export async function getDeliveryOptions(req, res, next) {
  try {
    const { orderNumber } = orderNumberParam.parse(req.params);
    const options = await deliveryService.evaluateDeliveryOptions(orderNumber);

    if (!options) {
      return errorResponse(res, 'ORDER_NOT_FOUND', 'Order not found.', 404);
    }

    return successResponse(res, options);
  } catch (err) {
    next(err);
  }
}
