import prisma from '../config/prisma.js';
import { generateEventNumber } from '../utils/generate-reference.js';

// ──────────────────────────────────────────────────
// DEMO CANCELLATION RULES — Simulated, not real Myntra policies.
// ──────────────────────────────────────────────────

const CANCELLABLE_ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PROCESSING'];

/**
 * Check if an order is eligible for cancellation under demo rules.
 */
function checkCancellationEligibility(order) {
  if (order.orderStatus === 'CANCELLED') {
    return { eligible: false, reason: 'This order has already been cancelled.' };
  }
  if (order.orderStatus === 'CANCELLATION_PENDING') {
    return { eligible: false, reason: 'A cancellation request is already pending for this order.' };
  }
  if (order.orderStatus === 'DELIVERED') {
    return { eligible: false, reason: 'This order has been delivered. Cancellation is not possible.' };
  }
  if (!CANCELLABLE_ORDER_STATUSES.includes(order.orderStatus)) {
    return {
      eligible: false,
      reason: `Cancellation is not available when order status is ${order.orderStatus}. The order may have already been shipped.`,
    };
  }
  return { eligible: true, reason: 'Order is eligible for cancellation under demo rules.' };
}

/**
 * Submit a cancellation request.
 * Creates a CANCELLATION_REQUESTED DeliveryEvent and sets order to CANCELLATION_PENDING.
 */
export async function requestCancellation(orderNumber, { reason, confirmation }) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { shipments: true },
  });

  if (!order) {
    return { error: 'ORDER_NOT_FOUND', message: 'Order not found.', status: 404 };
  }

  if (!confirmation) {
    return {
      error: 'CONFIRMATION_REQUIRED',
      message: 'Explicit customer confirmation is required to submit a cancellation request.',
      status: 422,
    };
  }

  const eligibility = checkCancellationEligibility(order);
  if (!eligibility.eligible) {
    return {
      error: 'CANCELLATION_NOT_ELIGIBLE',
      message: eligibility.reason,
      status: 422,
      eligibility,
    };
  }

  const eventNumber = generateEventNumber();

  const result = await prisma.$transaction(async (tx) => {
    // Create CANCELLATION_REQUESTED event
    const event = await tx.deliveryEvent.create({
      data: {
        eventNumber,
        orderId: order.id,
        shipmentId: order.shipments[0]?.id || null,
        eventType: 'CANCELLATION_REQUESTED',
        eventStatus: 'RECORDED',
        description: `Cancellation requested: ${reason}`,
        priority: 'HIGH',
      },
    });

    // Set order to CANCELLATION_PENDING — NOT CANCELLED
    await tx.order.update({
      where: { id: order.id },
      data: { orderStatus: 'CANCELLATION_PENDING' },
    });

    return event;
  });

  return {
    eventNumber: result.eventNumber,
    eventStatus: result.eventStatus,
    orderStatus: 'CANCELLATION_PENDING',
    eligibility,
    message: 'Cancellation request submitted. The order is now pending cancellation review. This does NOT mean the order is cancelled.',
  };
}

/**
 * Retrieve cancellation request history by filtering delivery events.
 */
export async function getCancellationRequests(orderNumber) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true },
  });

  if (!order) return null;

  const events = await prisma.deliveryEvent.findMany({
    where: {
      orderId: order.id,
      eventType: 'CANCELLATION_REQUESTED',
    },
    select: {
      eventNumber: true,
      eventStatus: true,
      description: true,
      priority: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return events;
}

/**
 * Submit a reschedule request.
 * Checks eligibility, then creates a RESCHEDULE_REQUESTED DeliveryEvent.
 */
export async function requestReschedule(orderNumber, { preferredDeliveryDate, preferredTimeWindow, reason, shipmentNumber }) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { shipments: true },
  });

  if (!order) {
    return { error: 'ORDER_NOT_FOUND', message: 'Order not found.', status: 404 };
  }

  // Find the target shipment
  let shipment = null;
  if (shipmentNumber) {
    shipment = order.shipments.find((s) => s.shipmentNumber === shipmentNumber);
    if (!shipment) {
      return {
        error: 'SHIPMENT_NOT_FOUND',
        message: 'The specified shipment does not belong to this order.',
        status: 422,
      };
    }
  } else if (order.shipments.length === 1) {
    shipment = order.shipments[0];
  }

  // Eligibility check (demo rules)
  const reschedulableDeliveryStatuses = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELAYED', 'DELIVERY_FAILED'];
  if (!shipment) {
    return {
      error: 'RESCHEDULE_NOT_ELIGIBLE',
      message: 'No shipment exists for this order. Rescheduling is not available.',
      status: 422,
    };
  }
  if (!reschedulableDeliveryStatuses.includes(shipment.deliveryStatus)) {
    return {
      error: 'RESCHEDULE_NOT_ELIGIBLE',
      message: `Rescheduling is not available when shipment status is ${shipment.deliveryStatus}.`,
      status: 422,
    };
  }
  if (shipment.attemptCount >= 3) {
    return {
      error: 'RESCHEDULE_NOT_ELIGIBLE',
      message: 'Maximum delivery attempts reached. Rescheduling is no longer available.',
      status: 422,
    };
  }

  const eventNumber = generateEventNumber();

  const description = preferredTimeWindow
    ? `Reschedule requested for ${preferredDeliveryDate.toISOString().split('T')[0]} (${preferredTimeWindow}): ${reason}`
    : `Reschedule requested for ${preferredDeliveryDate.toISOString().split('T')[0]}: ${reason}`;

  const event = await prisma.deliveryEvent.create({
    data: {
      eventNumber,
      orderId: order.id,
      shipmentId: shipment.id,
      eventType: 'RESCHEDULE_REQUESTED',
      eventStatus: 'RECORDED',
      description,
      priority: 'MEDIUM',
      preferredDeliveryDate,
    },
  });

  return {
    eventNumber: event.eventNumber,
    eventStatus: event.eventStatus,
    preferredDeliveryDate: event.preferredDeliveryDate,
    message: 'Reschedule request recorded. This is a request, not a confirmed delivery slot.',
  };
}
