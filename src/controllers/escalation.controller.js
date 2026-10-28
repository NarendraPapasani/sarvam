import * as escalationService from '../services/escalation.service.js';
import {
  createEscalationSchema,
  updateEscalationStatusSchema,
  escalationNumberParam,
  escalationsQuerySchema,
} from '../schemas/escalation.schema.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';

/**
 * POST /api/v1/escalations
 */
export async function createEscalation(req, res, next) {
  try {
    const body = createEscalationSchema.parse(req.body);
    const result = await escalationService.createEscalation(body);

    if (result.error) {
      return errorResponse(res, result.error, result.message, result.status);
    }

    return successResponse(res, result, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/escalations/:escalationNumber
 */
export async function getEscalation(req, res, next) {
  try {
    const { escalationNumber } = escalationNumberParam.parse(req.params);
    const escalation = await escalationService.getEscalationByNumber(escalationNumber);

    if (!escalation) {
      return errorResponse(res, 'ESCALATION_NOT_FOUND', 'Escalation not found.', 404);
    }

    return successResponse(res, escalation);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/escalations
 */
export async function listEscalations(req, res, next) {
  try {
    const query = escalationsQuerySchema.parse(req.query);
    const { escalations, total } = await escalationService.listEscalations(query);
    return paginatedResponse(res, escalations, query.page, query.limit, total);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/escalations/:escalationNumber/status
 */
export async function updateEscalationStatus(req, res, next) {
  try {
    const { escalationNumber } = escalationNumberParam.parse(req.params);
    const { status, assignedTeam } = updateEscalationStatusSchema.parse(req.body);

    const result = await escalationService.updateEscalationStatus(escalationNumber, status, assignedTeam);

    if (result.error) {
      return errorResponse(res, result.error, result.message, result.status);
    }

    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
}
