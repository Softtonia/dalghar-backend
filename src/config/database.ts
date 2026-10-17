import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './env.js';

// Ensure reliable public DNS resolution for MongoDB Atlas SRV and TXT lookups
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Fall back to system DNS if setServers is restricted
}

export const connectDatabase = async (): Promise<void> => {
  if (!config.mongodbUri) {
    console.warn('⚠️ MONGODB_URI is not set in environment variables. Database connection skipped.');
    return;
  }

  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      dbName: 'restaurant_management',
    });

    console.log(`✅ MongoDB Connected to database "${conn.connection.db?.databaseName || 'restaurant_management'}" on host: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error. Unable to connect to database.');
    throw error;
  }
};
