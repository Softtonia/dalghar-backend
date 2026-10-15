import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { createApp } from './app.js';

const startServer = async (): Promise<void> => {
  console.log('🔄 Loading environment configuration...');
  console.log(`ℹ️  Environment: ${config.env}, Port: ${config.port}`);

  console.log('🔄 Connecting to MongoDB database...');
  // 3. Connect to MongoDB Atlas (must succeed before HTTP server starts)
  await connectDatabase();

  // 4. Start HTTP server only after MongoDB connection succeeds
  const app = createApp();

  app.listen(config.port, () => {
    console.log(`🚀 HTTP Server successfully started on port ${config.port}`);
    console.log(`📡 Health Check URL: http://localhost:${config.port}/api/health`);
    console.log(`🔐 Login Auth Endpoint: http://localhost:${config.port}/api/auth/login`);
  });
};

startServer().catch((err) => {
  console.error('❌ Database connection or server initialization failed:', err.message);
  process.exit(1);
});
