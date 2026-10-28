import { z } from 'zod';

export const cancellationRequestSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(2000),
  confirmation: z.boolean().refine((v) => v === true, {
    message: 'Explicit customer confirmation (confirmation: true) is required to submit a cancellation request.',
  }),
});

export const rescheduleRequestSchema = z.object({
  preferredDeliveryDate: z.coerce.date().refine(
    (d) => d > new Date(),
    { message: 'Preferred delivery date must be in the future.' },
  ),
  preferredTimeWindow: z.string().max(100).optional(),
  reason: z.string().min(1, 'Reason is required').max(2000),
  shipmentNumber: z.string().optional(),
});
