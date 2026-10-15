import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from apps/api/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default(''),
  JWT_ACCESS_SECRET: z.string().default('CHANGE_THIS_TO_A_LONG_RANDOM_SECRET'),
  JWT_REFRESH_SECRET: z.string().default('CHANGE_THIS_TO_ANOTHER_LONG_RANDOM_SECRET'),
  CLIENT_URL: z.string().default('http://localhost:5175'),
  SEED_ADMIN_EMAIL: z.string().email().default('sales@softtonia.com'),
  SEED_ADMIN_PASSWORD: z.string().default('Softtonia@123'),

  // SMTP Mail Configuration
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
  SMTP_SECURE: z.string().default('false').transform((val) => val === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('Dal Ghar Admin <noreply@dalghar.com>'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment variables configuration.');
}

export const config = {
  env: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  mongodbUri: parsedEnv.data.MONGODB_URI,
  jwtAccessSecret: parsedEnv.data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: parsedEnv.data.JWT_REFRESH_SECRET,
  clientUrl: parsedEnv.data.CLIENT_URL,
  seedAdminEmail: parsedEnv.data.SEED_ADMIN_EMAIL,
  seedAdminPassword: parsedEnv.data.SEED_ADMIN_PASSWORD,

  // SMTP Mail Settings
  smtp: {
    host: parsedEnv.data.SMTP_HOST,
    port: parsedEnv.data.SMTP_PORT,
    secure: parsedEnv.data.SMTP_SECURE,
    user: parsedEnv.data.SMTP_USER,
    pass: parsedEnv.data.SMTP_PASS,
    from: parsedEnv.data.MAIL_FROM,
  },
};
