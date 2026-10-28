import prisma from '../config/prisma.js';

/**
 * Mask a phone number for safe DTO output.
 */
function maskPhone(phone) {
  if (!phone || phone.length < 4) return '****';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

/**
 * List orders with pagination, filtering, and date-range support.
 */
export async function listOrders({ page, limit, orderStatus, deliveryStatus, paymentStatus, orderNumber, startDate, endDate }) {
  const where = {};

  if (orderStatus) where.orderStatus = orderStatus;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (orderNumber) where.orderNumber = { contains: orderNumber, mode: 'insensitive' };

  if (startDate || endDate) {
    where.placedAt = {};
    if (startDate) where.placedAt.gte = startDate;
    if (endDate) where.placedAt.lte = endDate;
  }

  // deliveryStatus lives on Shipment, not Order — filter via relation
  if (deliveryStatus) {
    where.shipments = { some: { deliveryStatus } };
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { customerCode: true, fullName: true } },
        shipments: {
          select: { shipmentNumber: true, deliveryStatus: true, estimatedDeliveryDate: true },
        },
      },
      orderBy: { placedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  const mapped = orders.map((o) => ({
    orderNumber: o.orderNumber,
    orderStatus: o.orderStatus,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    totalAmount: o.totalAmount.toString(),
    currency: o.currency,
    placedAt: o.placedAt,
    customer: o.customer,
    shipments: o.shipments,
  }));

  return { orders: mapped, total };
}

/**
 * Retrieve a single order with full safe DTO (customer summary, items, address, shipments, events).
 */
export async function getOrderByNumber(orderNumber) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      customer: { select: { customerCode: true, fullName: true, phone: true, preferredLanguage: true } },
      shippingAddress: { select: { label: true, city: true, state: true, postalCode: true } },
      items: { select: { productName: true, productCategory: true, size: true, quantity: true, unitPrice: true } },
      shipments: {
        select: {
          shipmentNumber: true, deliveryStatus: true, carrierName: true,
          estimatedDeliveryDate: true, actualDeliveryAt: true, attemptCount: true,
          lastFailureReason: true,
        },
      },
      deliveryEvents: {
        select: {
          eventNumber: true, eventType: true, eventStatus: true, description: true,
          failureReason: true, attemptNumber: true, priority: true, createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) return null;

  return {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount.toString(),
    currency: order.currency,
    placedAt: order.placedAt,
    customer: {
      customerCode: order.customer.customerCode,
      fullName: order.customer.fullName,
      phone: maskPhone(order.customer.phone),
      preferredLanguage: order.customer.preferredLanguage,
    },
    shippingAddress: order.shippingAddress,
    items: order.items.map((i) => ({
      ...i,
      unitPrice: i.unitPrice.toString(),
    })),
    shipments: order.shipments.map((s) => ({
      ...s,
      estimatedDeliveryDate: s.estimatedDeliveryDate,
      actualDeliveryAt: s.actualDeliveryAt,
    })),
    deliveryEvents: order.deliveryEvents,
  };
}

/**
 * Concise status summary for the Sarvam voice agent.
 */
export async function getOrderStatus(orderNumber) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      shipments: {
        select: {
          shipmentNumber: true, deliveryStatus: true,
          estimatedDeliveryDate: true, attemptCount: true, lastFailureReason: true,
        },
      },
      deliveryEvents: {
        select: { eventNumber: true, eventType: true, eventStatus: true, description: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!order) return null;

  return {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    shipments: order.shipments.map((s) => ({
      shipmentNumber: s.shipmentNumber,
      deliveryStatus: s.deliveryStatus,
      estimatedDeliveryDate: s.estimatedDeliveryDate,
      attemptCount: s.attemptCount,
      lastFailureReason: s.lastFailureReason,
    })),
    latestDeliveryEvent: order.deliveryEvents[0] || null,
  };
}
