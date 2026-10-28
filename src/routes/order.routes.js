import { Router } from 'express';
import { listOrders, getOrder, getOrderStatus, getDeliveryOptions } from '../controllers/order.controller.js';
import { getDeliveryEvents, createDeliveryEvent } from '../controllers/delivery.controller.js';
import { requestCancellation, getCancellationRequests, requestReschedule } from '../controllers/cancellation.controller.js';
import { authenticate } from '../middleware/authentication.js';

const router = Router();

router.get('/', authenticate, listOrders);
router.get('/:orderNumber', authenticate, getOrder);
router.get('/:orderNumber/status', authenticate, getOrderStatus);
router.get('/:orderNumber/delivery-options', authenticate, getDeliveryOptions);

// Delivery events sub-routes
router.get('/:orderNumber/delivery-events', authenticate, getDeliveryEvents);
router.post('/:orderNumber/delivery-events', authenticate, createDeliveryEvent);

// Cancellation requests
router.post('/:orderNumber/cancellation-requests', authenticate, requestCancellation);
router.get('/:orderNumber/cancellation-requests', authenticate, getCancellationRequests);

// Reschedule requests
router.post('/:orderNumber/reschedule-requests', authenticate, requestReschedule);

export default router;
