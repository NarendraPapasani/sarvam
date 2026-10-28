import prisma from '../config/prisma.js';
import { generateEventNumber } from '../utils/generate-reference.js';

// ──────────────────────────────────────────────────
// DEMO ELIGIBILITY SERVICE — Simulated Business Rules
// These rules are fictional and do NOT represent real Myntra policies.
// ──────────────────────────────────────────────────

/**
 * Permitted event-status transitions.
 * Prevents arbitrary modification of historical records.
 */
const ALLOWED_EVENT_STATUS_TRANSITIONS = {
  OPEN: ['RECORDED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED'],
  RECORDED: ['IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED', 'ESCALATED'],
  RESOLVED: [],
  REJECTED: [],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
};

/**
 * Event types that count as delivery attempts and should update shipment stats.
 */
const ATTEMPT_EVENT_TYPES = ['DELIVERY_ATTEMPT', 'DELIVERY_FAILED', 'CUSTOMER_UNAVAILABLE'];

/**
 * Evaluate what delivery-related actions are available for an order.
 * DEMO RULES — not production Myntra policies.
 */
export async function evaluateDeliveryOptions(orderNumber) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      shipments: true,
      deliveryEvents: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!order) return null;

  const actions = [];
  const unavailable = [];

  const primaryShipment = order.shipments[0];

  // ─── Cancellation eligibility ───
  const cancellableStatuses = ['PLACED', 'CONFIRMED', 'PROCESSING'];
  if (cancellableStatuses.includes(order.orderStatus)) {
    actions.push({
      action: 'REQUEST_CANCELLATION',
      reason: 'Order has not been shipped yet and may be cancelled.',
      requiresConfirmation: true,
    });
  } else if (order.orderStatus === 'CANCELLATION_PENDING') {
    unavailable.push({
      action: 'REQUEST_CANCELLATION',
      reason: 'A cancellation request is already pending for this order.',
    });
  } else if (order.orderStatus === 'CANCELLED') {
    unavailable.push({
      action: 'REQUEST_CANCELLATION',
      reason: 'This order has already been cancelled.',
    });
  } else if (order.orderStatus === 'DELIVERED') {
    unavailable.push({
      action: 'REQUEST_CANCELLATION',
      reason: 'This order has been delivered. Cancellation is not possible.',
    });
  } else {
    unavailable.push({
      action: 'REQUEST_CANCELLATION',
      reason: 'Cancellation is not available once the order has been shipped.',
    });
  }

  // ─── Rescheduling eligibility ───
  const reschedulableDeliveryStatuses = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELAYED', 'DELIVERY_FAILED'];
  if (primaryShipment && reschedulableDeliveryStatuses.includes(primaryShipment.deliveryStatus)) {
    if (primaryShipment.attemptCount < 3) {
      actions.push({
        action: 'REQUEST_RESCHEDULE',
        reason: 'The shipment is eligible for delivery rescheduling.',
        requiresConfirmation: false,
      });
    } else {
      unavailable.push({
        action: 'REQUEST_RESCHEDULE',
        reason: 'Maximum delivery attempts have been reached. Rescheduling is no longer available.',
      });
    }
  } else if (!primaryShipment) {
    unavailable.push({
      action: 'REQUEST_RESCHEDULE',
      reason: 'No shipment exists for this order yet.',
    });
  } else {
    unavailable.push({
      action: 'REQUEST_RESCHEDULE',
      reason: `Rescheduling is not available when shipment status is ${primaryShipment.deliveryStatus}.`,
    });
  }

  // ─── Report Issue ───
  if (order.orderStatus !== 'CANCELLED') {
    actions.push({
      action: 'REPORT_ISSUE',
      reason: 'You may report a delivery issue or complaint.',
      requiresConfirmation: false,
    });
  }

  // ─── Escalation ───
  actions.push({
    action: 'CREATE_ESCALATION',
    reason: 'You may escalate this to a support team.',
    requiresConfirmation: false,
  });

  return {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    currentDeliveryStatus: primaryShipment?.deliveryStatus || 'NOT_SHIPPED',
    eligibleActions: actions,
    unavailableActions: unavailable,
  };
}

/**
 * Get delivery events for an order in chronological order.
 */
export async function getDeliveryEvents(orderNumber) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true },
  });

  if (!order) return null;

  const events = await prisma.deliveryEvent.findMany({
    where: { orderId: order.id },
    select: {
      eventNumber: true,
      eventType: true,
      eventStatus: true,
      description: true,
      failureReason: true,
      attemptNumber: true,
      priority: true,
      preferredDeliveryDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return events;
}

/**
 * Create a delivery event (attempt, issue, complaint, etc.).
 * Uses a Prisma transaction to keep shipment stats consistent.
 */
export async function createDeliveryEvent(orderNumber, data) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { shipments: true },
  });

  if (!order) return { error: 'ORDER_NOT_FOUND', message: 'Order not found.', status: 404 };

  // If a shipmentNumber is provided, verify it belongs to this order
  let shipment = null;
  if (data.shipmentNumber) {
    shipment = order.shipments.find((s) => s.shipmentNumber === data.shipmentNumber);
    if (!shipment) {
      return {
        error: 'SHIPMENT_NOT_FOUND',
        message: 'The specified shipment does not belong to this order.',
        status: 422,
      };
    }
  } else if (order.shipments.length === 1) {
    // Default to the only shipment if there's exactly one
    shipment = order.shipments[0];
  }

  const eventNumber = generateEventNumber();

  // Transaction: create event + update shipment stats if applicable
  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.deliveryEvent.create({
      data: {
        eventNumber,
        orderId: order.id,
        shipmentId: shipment?.id || null,
        eventType: data.eventType,
        eventStatus: 'RECORDED',
        description: data.description,
        failureReason: data.failureReason || null,
        attemptNumber: data.attemptNumber || null,
        customerContacted: data.customerContacted ?? null,
        priority: data.priority || 'MEDIUM',
        preferredDeliveryDate: data.preferredDeliveryDate || null,
      },
    });

    // Update shipment attempt count and failure reason for attempt-type events
    if (shipment && ATTEMPT_EVENT_TYPES.includes(data.eventType)) {
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          attemptCount: { increment: 1 },
          lastFailureReason: data.failureReason || shipment.lastFailureReason,
        },
      });
    }

    return event;
  });

  return {
    eventNumber: result.eventNumber,
    eventStatus: result.eventStatus,
    eventType: result.eventType,
    createdAt: result.createdAt,
  };
}

/**
 * Get a single delivery event with safe order/shipment summary.
 */
export async function getDeliveryEventByNumber(eventNumber) {
  const event = await prisma.deliveryEvent.findUnique({
    where: { eventNumber },
    include: {
      order: { select: { orderNumber: true, orderStatus: true } },
      shipment: { select: { shipmentNumber: true, deliveryStatus: true } },
    },
  });

  if (!event) return null;

  return {
    eventNumber: event.eventNumber,
    eventType: event.eventType,
    eventStatus: event.eventStatus,
    description: event.description,
    failureReason: event.failureReason,
    attemptNumber: event.attemptNumber,
    customerContacted: event.customerContacted,
    priority: event.priority,
    preferredDeliveryDate: event.preferredDeliveryDate,
    resolutionNotes: event.resolutionNotes,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    order: event.order,
    shipment: event.shipment,
  };
}

/**
 * Update delivery event status through permitted transitions only.
 */
export async function updateDeliveryEventStatus(eventNumber, newStatus, resolutionNotes) {
  const event = await prisma.deliveryEvent.findUnique({ where: { eventNumber } });

  if (!event) return { error: 'EVENT_NOT_FOUND', message: 'Delivery event not found.', status: 404 };

  const allowed = ALLOWED_EVENT_STATUS_TRANSITIONS[event.eventStatus] || [];
  if (!allowed.includes(newStatus)) {
    return {
      error: 'INVALID_TRANSITION',
      message: `Transition from ${event.eventStatus} to ${newStatus} is not allowed.`,
      status: 409,
    };
  }

  const updated = await prisma.deliveryEvent.update({
    where: { eventNumber },
    data: {
      eventStatus: newStatus,
      resolutionNotes: resolutionNotes || event.resolutionNotes,
    },
  });

  return {
    eventNumber: updated.eventNumber,
    eventStatus: updated.eventStatus,
    resolutionNotes: updated.resolutionNotes,
    updatedAt: updated.updatedAt,
  };
}
