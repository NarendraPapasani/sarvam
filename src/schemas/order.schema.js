import { z } from 'zod';

export const orderNumberParam = z.object({
  orderNumber: z.string().regex(/^ORD-\d+$/, 'Invalid order number format (expected ORD-XXXX)'),
});

export const ordersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  orderStatus: z.enum([
    'PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED',
    'DELIVERED', 'CANCELLATION_PENDING', 'CANCELLED',
  ]).optional(),
  deliveryStatus: z.enum([
    'NOT_SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELAYED',
    'DELIVERY_FAILED', 'DELIVERED', 'RETURN_TO_ORIGIN',
  ]).optional(),
  paymentStatus: z.enum([
    'PENDING', 'PAID', 'FAILED', 'REFUND_PENDING',
    'PARTIALLY_REFUNDED', 'REFUNDED', 'NOT_APPLICABLE',
  ]).optional(),
  orderNumber: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const customerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
