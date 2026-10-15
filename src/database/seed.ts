import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { seedSuperAdmin } from './seeders/admin.seeder.js';

const runSeed = async (): Promise<void> => {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    await seedSuperAdmin();

    console.log('Database seeding completed.');
  } catch (error) {
    console.error('❌ Database seeding failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from database.');
    }
  }
};

runSeed();
