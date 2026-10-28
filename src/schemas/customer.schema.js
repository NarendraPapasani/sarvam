import { z } from 'zod';

export const customerCodeParam = z.object({
  customerCode: z.string().regex(/^CUST-\d+$/, 'Invalid customer code format (expected CUST-XXXX)'),
});
