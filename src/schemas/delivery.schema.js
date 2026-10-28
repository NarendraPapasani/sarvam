import { z } from 'zod';

export const createDeliveryEventSchema = z.object({
  eventType: z.enum([
    'DELIVERY_ATTEMPT', 'DELIVERY_FAILED', 'DELIVERY_SUCCESSFUL',
    'DELIVERY_DELAYED', 'ADDRESS_ISSUE', 'CUSTOMER_UNAVAILABLE',
    'CUSTOMER_DISPUTE', 'MARKED_DELIVERED_NOT_RECEIVED',
    'RESCHEDULE_REQUESTED', 'CANCELLATION_REQUESTED',
    'DAMAGED_PARCEL', 'OTHER',
  ]),
  description: z.string().min(1, 'Description is required').max(2000),
  shipmentNumber: z.string().optional(),
  failureReason: z.string().max(1000).optional(),
  attemptNumber: z.coerce.number().int().min(1).optional(),
  customerContacted: z.boolean().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  preferredDeliveryDate: z.coerce.date().optional(),
});

export const updateEventStatusSchema = z.object({
  status: z.enum(['OPEN', 'RECORDED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED']),
  resolutionNotes: z.string().max(2000).optional(),
});

export const eventNumberParam = z.object({
  eventNumber: z.string().regex(/^EVT-\d+/, 'Invalid event number format (expected EVT-XXXX)'),
});
