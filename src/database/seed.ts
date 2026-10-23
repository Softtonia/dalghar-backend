import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { seedSuperAdmin } from './seeders/admin.seeder.js';
import { seedDefaultRoles } from './seeders/role.seeder.js';
import { seedPeripherals } from './seeders/peripherals.seeder.js';
import { seedMenuAndCatalog } from './seeders/menu.seeder.js';
import { seedDiningAreasAndTables } from './seeders/dining.seeder.js';
import { seedReservationsAndWaitingList } from './seeders/reservation.seeder.js';
import { EmailTemplateService } from '../modules/email-templates/email-template.service.js';

const runSeed = async (): Promise<void> => {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    await seedSuperAdmin();
    await seedDefaultRoles();
    await seedPeripherals();
    await seedMenuAndCatalog();
    await seedDiningAreasAndTables();
    await seedReservationsAndWaitingList();
    await EmailTemplateService.seedDefaultTemplates();

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
