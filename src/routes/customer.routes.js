import { Router } from 'express';
import { getCustomer, getCustomerOrders } from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/authentication.js';

const router = Router();

router.get('/:customerCode', authenticate, getCustomer);
router.get('/:customerCode/orders', authenticate, getCustomerOrders);

export default router;
