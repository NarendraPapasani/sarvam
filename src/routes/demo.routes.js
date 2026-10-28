import { Router } from 'express';
import prisma from '../config/prisma.js';
import env from '../config/env.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import { authenticate } from '../middleware/authentication.js';

const router = Router();

/**
 * Scenario manifest for the 20 seeded orders.
 */
const SCENARIOS = [
  { orderNumber: 'ORD-1001', description: 'Confirmed, not shipped, prepaid' },
  { orderNumber: 'ORD-1002', description: 'Processing, COD' },
  { orderNumber: 'ORD-1003', description: 'Shipped, in transit, prepaid' },
  { orderNumber: 'ORD-1004', description: 'Shipped, delayed, prepaid' },
  { orderNumber: 'ORD-1005', description: 'Out for delivery' },
  { orderNumber: 'ORD-1006', description: 'One failed attempt — customer unavailable' },
  { orderNumber: 'ORD-1007', description: 'Failed attempt disputed by customer' },
  { orderNumber: 'ORD-1008', description: 'Multiple failed attempts' },
  { orderNumber: 'ORD-1009', description: 'Marked delivered but customer reports non-receipt' },
  { orderNumber: 'ORD-1010', description: 'Delivered successfully' },
  { orderNumber: 'ORD-1011', description: 'Address issue' },
  { orderNumber: 'ORD-1012', description: 'Customer requested a future delivery date' },
  { orderNumber: 'ORD-1013', description: 'Cancellation request pending' },
  { orderNumber: 'ORD-1014', description: 'Cancellation request rejected under demo rules' },
  { orderNumber: 'ORD-1015', description: 'COD order with delivery refusal event' },
  { orderNumber: 'ORD-1016', description: 'Prepaid order with payment status REFUND_PENDING' },
  { orderNumber: 'ORD-1017', description: 'Order with two shipments and distinct delivery statuses' },
  { orderNumber: 'ORD-1018', description: 'Shipment with a damaged-parcel issue' },
  { orderNumber: 'ORD-1019', description: 'Order with an open support escalation' },
  { orderNumber: 'ORD-1020', description: 'Multiple historical attempts and an unresolved issue' },
];

/**
 * GET /api/v1/demo/scenarios
 */
router.get('/scenarios', (_req, res) => {
  return successResponse(res, { scenarios: SCENARIOS });
});

/**
 * POST /api/v1/demo/reset
 * Development-only: reset and reseed demo data.
 * DISABLED in production. Never expose destructive reset publicly.
 */
router.post('/reset', authenticate, async (_req, res) => {
  if (env.isProduction) {
    return errorResponse(res, 'FORBIDDEN', 'Demo reset is disabled in production.', 403);
  }

  try {
    // Delete in correct FK order
    await prisma.escalation.deleteMany();
    await prisma.deliveryEvent.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.address.deleteMany();
    await prisma.customer.deleteMany();

    return successResponse(res, {
      message: 'All demo data has been deleted. Run `npm run prisma:seed` to reseed.',
    });
  } catch (err) {
    return errorResponse(res, 'RESET_FAILED', 'Failed to reset demo data.', 500);
  }
});

export default router;
