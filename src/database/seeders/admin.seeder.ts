import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { config } from '../../config/env.js';
import { ALL_PERMISSIONS } from '../../config/permissions.js';

export const seedSuperAdmin = async (): Promise<void> => {
  if (!config.seedAdminEmail || !config.seedAdminPassword) {
    throw new Error('Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD in environment configuration.');
  }

  const normalizedEmail = config.seedAdminEmail.toLowerCase().trim();

  // Find existing user by normalized email
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    console.log('Super Admin already exists. No new user created.');
    return;
  }

  console.log('Seeding Super Admin...');

  const passwordHash = await bcrypt.hash(config.seedAdminPassword, 10);

  await User.create({
    name: 'Super Admin',
    email: normalizedEmail,
    passwordHash,
    role: 'SUPER_ADMIN',
    isActive: true,
    restaurantId: null,
    branchId: null,
    permissions: ALL_PERMISSIONS,
  });

  console.log('Super Admin created successfully.');
};
