import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['DATABASE_URL', 'API_SECRET'];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`FATAL: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  API_SECRET: process.env.API_SECRET,
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

export default env;
