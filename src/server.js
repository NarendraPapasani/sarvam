import app from './app.js';
import env from './config/env.js';
import prisma from './config/prisma.js';

async function main() {
  // Verify database connectivity before starting the server
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected via Prisma');
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    console.log(`📖 Health: http://localhost:${env.PORT}/health`);
    console.log(`📖 Readiness: http://localhost:${env.PORT}/api/v1/health/ready`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
