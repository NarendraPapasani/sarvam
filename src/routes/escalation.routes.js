import { Router } from 'express';
import {
  createEscalation,
  getEscalation,
  listEscalations,
  updateEscalationStatus,
} from '../controllers/escalation.controller.js';
import { authenticate } from '../middleware/authentication.js';

const router = Router();

router.post('/', authenticate, createEscalation);
router.get('/', authenticate, listEscalations);
router.get('/:escalationNumber', authenticate, getEscalation);
router.patch('/:escalationNumber/status', authenticate, updateEscalationStatus);

export default router;
