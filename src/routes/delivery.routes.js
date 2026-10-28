import { Router } from 'express';
import { getDeliveryEvent, updateDeliveryEventStatus } from '../controllers/delivery.controller.js';
import { authenticate } from '../middleware/authentication.js';

const router = Router();

router.get('/:eventNumber', authenticate, getDeliveryEvent);
router.patch('/:eventNumber/status', authenticate, updateDeliveryEventStatus);

export default router;
