import mongoose from 'mongoose';
import { config } from './env.js';

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
