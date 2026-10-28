import { z } from 'zod';

export const createEscalationSchema = z.object({
  orderNumber: z.string().optional(),
  eventNumber: z.string().optional(),
  reason: z.string().min(1, 'Reason is required').max(2000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
}).refine(
  (data) => data.orderNumber || data.eventNumber,
  { message: 'At least one of orderNumber or eventNumber is required.' },
);

export const updateEscalationStatusSchema = z.object({
  status: z.enum(['OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED']),
  assignedTeam: z.string().max(200).optional(),
});

export const escalationNumberParam = z.object({
  escalationNumber: z.string().regex(/^ESC-\d+/, 'Invalid escalation number format (expected ESC-XXXX)'),
});

export const escalationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});
