import prisma from '../config/prisma.js';
import { generateEscalationNumber } from '../utils/generate-reference.js';

/**
 * Permitted escalation-status transitions.
 */
const ALLOWED_ESCALATION_TRANSITIONS = {
  OPEN: ['ASSIGNED', 'RESOLVED', 'CLOSED'],
  ASSIGNED: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

/**
 * Create a support escalation.
 * Requires at least one meaningful reference (order or event).
 * Optionally updates the related DeliveryEvent status to ESCALATED.
 */
export async function createEscalation({ orderNumber, eventNumber, reason, priority }) {
  let orderId = null;
  let deliveryEventId = null;

  // Resolve order reference
  if (orderNumber) {
    const order = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } });
    if (!order) {
      return { error: 'ORDER_NOT_FOUND', message: 'Referenced order not found.', status: 404 };
    }
    orderId = order.id;
  }

  // Resolve event reference
  if (eventNumber) {
    const event = await prisma.deliveryEvent.findUnique({
      where: { eventNumber },
      select: { id: true, orderId: true },
    });
    if (!event) {
      return { error: 'EVENT_NOT_FOUND', message: 'Referenced delivery event not found.', status: 404 };
    }
    // If both are provided, verify event belongs to the order
    if (orderId && event.orderId !== orderId) {
      return {
        error: 'EVENT_ORDER_MISMATCH',
        message: 'The specified delivery event does not belong to the specified order.',
        status: 422,
      };
    }
    deliveryEventId = event.id;
    // If only event was provided, use its order
    if (!orderId) orderId = event.orderId;
  }

  const escalationNumber = generateEscalationNumber();

  const result = await prisma.$transaction(async (tx) => {
    const escalation = await tx.escalation.create({
      data: {
        escalationNumber,
        orderId,
        deliveryEventId,
        reason,
        priority: priority || 'MEDIUM',
        status: 'OPEN',
      },
    });

    // Update related event status to ESCALATED if applicable
    if (deliveryEventId) {
      const event = await tx.deliveryEvent.findUnique({ where: { id: deliveryEventId } });
      const allowed = ['OPEN', 'RECORDED', 'IN_PROGRESS'];
      if (event && allowed.includes(event.eventStatus)) {
        await tx.deliveryEvent.update({
          where: { id: deliveryEventId },
          data: { eventStatus: 'ESCALATED' },
        });
      }
    }

    return escalation;
  });

  return {
    escalationNumber: result.escalationNumber,
    status: result.status,
    priority: result.priority,
    createdAt: result.createdAt,
  };
}

/**
 * Get a single escalation with safe related summaries.
 */
export async function getEscalationByNumber(escalationNumber) {
  const escalation = await prisma.escalation.findUnique({
    where: { escalationNumber },
    include: {
      order: { select: { orderNumber: true, orderStatus: true } },
      deliveryEvent: { select: { eventNumber: true, eventType: true, eventStatus: true } },
    },
  });

  if (!escalation) return null;

  return {
    escalationNumber: escalation.escalationNumber,
    reason: escalation.reason,
    priority: escalation.priority,
    status: escalation.status,
    assignedTeam: escalation.assignedTeam,
    createdAt: escalation.createdAt,
    updatedAt: escalation.updatedAt,
    order: escalation.order,
    deliveryEvent: escalation.deliveryEvent,
  };
}

/**
 * List escalations with pagination and optional filtering.
 */
export async function listEscalations({ page, limit, status, priority }) {
  const where = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const skip = (page - 1) * limit;

  const [escalations, total] = await Promise.all([
    prisma.escalation.findMany({
      where,
      include: {
        order: { select: { orderNumber: true, orderStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.escalation.count({ where }),
  ]);

  const mapped = escalations.map((e) => ({
    escalationNumber: e.escalationNumber,
    reason: e.reason,
    priority: e.priority,
    status: e.status,
    assignedTeam: e.assignedTeam,
    createdAt: e.createdAt,
    order: e.order,
  }));

  return { escalations: mapped, total };
}

/**
 * Update escalation status through permitted transitions.
 */
export async function updateEscalationStatus(escalationNumber, newStatus, assignedTeam) {
  const escalation = await prisma.escalation.findUnique({ where: { escalationNumber } });

  if (!escalation) {
    return { error: 'ESCALATION_NOT_FOUND', message: 'Escalation not found.', status: 404 };
  }

  const allowed = ALLOWED_ESCALATION_TRANSITIONS[escalation.status] || [];
  if (!allowed.includes(newStatus)) {
    return {
      error: 'INVALID_TRANSITION',
      message: `Transition from ${escalation.status} to ${newStatus} is not allowed.`,
      status: 409,
    };
  }

  const updated = await prisma.escalation.update({
    where: { escalationNumber },
    data: {
      status: newStatus,
      assignedTeam: assignedTeam || escalation.assignedTeam,
    },
  });

  return {
    escalationNumber: updated.escalationNumber,
    status: updated.status,
    assignedTeam: updated.assignedTeam,
    updatedAt: updated.updatedAt,
  };
}
