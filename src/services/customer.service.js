import prisma from '../config/prisma.js';

/**
 * Mask a phone number: +91-9876543210 → +91-****3210
 */
function maskPhone(phone) {
  if (!phone || phone.length < 4) return '****';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

export async function getCustomerByCode(customerCode) {
  const customer = await prisma.customer.findUnique({
    where: { customerCode },
  });

  if (!customer) return null;

  return {
    customerCode: customer.customerCode,
    fullName: customer.fullName,
    preferredLanguage: customer.preferredLanguage,
    phone: maskPhone(customer.phone),
  };
}

export async function getCustomerOrdersPaginated(customerCode, page, limit) {
  const customer = await prisma.customer.findUnique({
    where: { customerCode },
    select: { id: true },
  });

  if (!customer) return null;

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        shipments: {
          select: {
            shipmentNumber: true,
            deliveryStatus: true,
            estimatedDeliveryDate: true,
          },
        },
      },
      orderBy: { placedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: { customerId: customer.id } }),
  ]);

  const mapped = orders.map((o) => ({
    orderNumber: o.orderNumber,
    orderStatus: o.orderStatus,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    totalAmount: o.totalAmount.toString(),
    currency: o.currency,
    placedAt: o.placedAt,
    shipments: o.shipments.map((s) => ({
      shipmentNumber: s.shipmentNumber,
      deliveryStatus: s.deliveryStatus,
      estimatedDeliveryDate: s.estimatedDeliveryDate,
    })),
  }));

  return { orders: mapped, total };
}
