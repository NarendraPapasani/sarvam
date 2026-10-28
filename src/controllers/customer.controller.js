import * as customerService from '../services/customer.service.js';
import { customerCodeParam } from '../schemas/customer.schema.js';
import { customerOrdersQuerySchema } from '../schemas/order.schema.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';

/**
 * GET /api/v1/customers/:customerCode
 */
export async function getCustomer(req, res, next) {
  try {
    const { customerCode } = customerCodeParam.parse(req.params);
    const customer = await customerService.getCustomerByCode(customerCode);

    if (!customer) {
      return errorResponse(res, 'CUSTOMER_NOT_FOUND', 'Customer not found.', 404);
    }

    return successResponse(res, customer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/customers/:customerCode/orders
 * NOTE: Customer-code lookup alone is NOT sufficient authentication
 * for a real production system.
 */
export async function getCustomerOrders(req, res, next) {
  try {
    const { customerCode } = customerCodeParam.parse(req.params);
    const { page, limit } = customerOrdersQuerySchema.parse(req.query);

    const result = await customerService.getCustomerOrdersPaginated(customerCode, page, limit);

    if (!result) {
      return errorResponse(res, 'CUSTOMER_NOT_FOUND', 'Customer not found.', 404);
    }

    return paginatedResponse(res, result.orders, page, limit, result.total);
  } catch (err) {
    next(err);
  }
}
