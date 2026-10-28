import { PrismaClient } from '@prisma/client';
import env from './env.js';

const prisma = new PrismaClient({
  log: env.isDevelopment ? ['query', 'warn', 'error'] : ['error'],
});

export default prisma;
