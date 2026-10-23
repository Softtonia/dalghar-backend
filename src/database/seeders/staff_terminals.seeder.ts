import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../../config/database.js';
import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { UserHasRole } from '../../models/UserHasRole.js';
import { Restaurant } from '../../models/Restaurant.js';
import { Branch } from '../../models/Branch.js';
import { PosTerminal } from '../../models/PosTerminal.js';
import { PosTerminalAssignment } from '../../models/PosTerminalAssignment.js';
import { ROLE_PERMISSIONS } from '../../config/permissions.js';

export const seedMultiRoleStaffAndTerminals = async (): Promise<void> => {
  console.log('⚡ Starting Seeding of Staff Roles, Permissions & Dedicated Terminals...');

  // 1. Resolve Restaurant & Branch
  let restaurant = await Restaurant.findOne();
  if (!restaurant) {
    restaurant = await Restaurant.create({
      name: 'Dal Ghar Royal Dining',
      slug: 'dal-ghar-royal-dining',
      isActive: true,
    } as any);
  }

  let branch = await Branch.findOne({ restaurantId: restaurant._id });
  if (!branch) {
    branch = await Branch.create({
      restaurantId: restaurant._id,
      name: 'Dal Ghar - Flagship Outlet',
      code: 'DG-B01',
      slug: 'dal-ghar-flagship-outlet',
      type: 'MAIN' as any,
      operatingStatus: 'ACTIVE',
    });
  }

  // 2. Define Dedicated Terminals for Each Role
  const terminalConfigs = [
    {
      terminal_code: 'POS-CASHIER-01',
      terminal_name: 'Cashier Station 1 (Front Desk)',
      terminal_type: 'CASHIER' as const,
      device_type: 'desktop' as const,
      settings: {
        require_manager_approval: false,
        auto_print_receipt: true,
        allow_cash_sales: true,
        allow_card_sales: true,
      },
    },
    {
      terminal_code: 'POS-MANAGER-01',
      terminal_name: 'Manager Terminal (Floor Admin)',
      terminal_type: 'MANAGER' as const,
      device_type: 'desktop' as const,
      settings: {
        require_manager_approval: false,
        auto_print_receipt: true,
        allow_cash_sales: true,
        allow_card_sales: true,
      },
    },
    {
      terminal_code: 'POS-WAITER-01',
      terminal_name: 'Waiter Handheld 1 (Ground Floor)',
      terminal_type: 'WAITER' as const,
      device_type: 'tablet' as const,
      settings: {
        require_manager_approval: true, // Waiter orders require Manager approval
        auto_print_receipt: false,
        allow_cash_sales: false,
        allow_card_sales: false,
      },
    },
    {
      terminal_code: 'POS-KITCHEN-01',
      terminal_name: 'Kitchen KDS Screen 1 (Main Kitchen)',
      terminal_type: 'KITCHEN' as const,
      device_type: 'desktop' as const,
      settings: {
        require_manager_approval: false,
        auto_print_receipt: false,
        allow_cash_sales: false,
        allow_card_sales: false,
      },
    },
  ];

  const seededTerminals: Record<string, any> = {};

  for (const tConfig of terminalConfigs) {
    let term = await PosTerminal.findOne({
      branch_id: branch._id,
      terminal_code: tConfig.terminal_code,
      deleted_at: null,
    });

    if (!term) {
      term = await PosTerminal.create({
        restaurant_id: restaurant._id,
        branch_id: branch._id,
        terminal_code: tConfig.terminal_code,
        terminal_name: tConfig.terminal_name,
        name: tConfig.terminal_name,
        terminal_type: tConfig.terminal_type,
        device_type: tConfig.device_type,
        status: 'active',
        connectivity_status: 'online',
        settings: tConfig.settings,
      });
      console.log(`✅ Created Dedicated Terminal: ${term.terminal_code} (${term.terminal_type})`);
    } else {
      term.terminal_type = tConfig.terminal_type;
      term.settings = { ...term.settings, ...tConfig.settings };
      term.status = 'active';
      await term.save();
    }
    seededTerminals[tConfig.terminal_type] = term;
  }

  // 3. Define Users for Each Role with Full Permissions
  const staffConfigs = [
    {
      email: 'manager@dalghar.com',
      name: 'Rajesh Sharma',
      role: 'BRANCH_MANAGER',
      roleSlug: 'branch-manager',
      permissions: ROLE_PERMISSIONS.BRANCH_MANAGER,
      terminalType: 'MANAGER',
    },
    {
      email: 'cashier@dalghar.com',
      name: 'Amit Patel',
      role: 'CASHIER',
      roleSlug: 'cashier',
      permissions: ROLE_PERMISSIONS.CASHIER,
      terminalType: 'CASHIER',
    },
    {
      email: 'waiter@dalghar.com',
      name: 'Ramesh Kumar',
      role: 'WAITER',
      roleSlug: 'waiter',
      permissions: ROLE_PERMISSIONS.WAITER,
      terminalType: 'WAITER',
    },
    {
      email: 'kitchen@dalghar.com',
      name: 'Chef Sanjeev',
      role: 'KITCHEN_STAFF',
      roleSlug: 'kitchen-staff',
      permissions: ROLE_PERMISSIONS.KITCHEN_STAFF,
      terminalType: 'KITCHEN',
    },
  ];

  const defaultPassword = await bcrypt.hash('Staff@123', 10);

  for (const staff of staffConfigs) {
    let user = await User.findOne({ email: staff.email });
    if (!user) {
      user = await User.create({
        name: staff.name,
        email: staff.email,
        passwordHash: defaultPassword,
        role: staff.role,
        restaurantId: String(restaurant._id),
        branchId: String(branch._id),
        isActive: true,
        permissions: staff.permissions,
      });
      console.log(`👤 Created Staff User: ${staff.name} (${staff.email}) - Role: ${staff.role}`);
    } else {
      user.role = staff.role;
      user.restaurantId = String(restaurant._id);
      user.branchId = String(branch._id);
      user.isActive = true;
      user.permissions = staff.permissions;
      await user.save();
      console.log(`🔄 Updated Permissions for: ${staff.email} (${staff.role})`);
    }

    // Role relation
    const roleDoc = await Role.findOne({ slug: staff.roleSlug });
    if (roleDoc) {
      await UserHasRole.findOneAndUpdate(
        { userId: user._id, roleId: roleDoc._id },
        { userId: user._id, roleId: roleDoc._id },
        { upsert: true }
      );
    }

    // Assign to dedicated terminal
    const targetTerminal = seededTerminals[staff.terminalType];
    if (targetTerminal) {
      await PosTerminalAssignment.findOneAndUpdate(
        { terminal_id: targetTerminal._id, user_id: user._id, is_active: true },
        {
          restaurant_id: restaurant._id,
          branch_id: branch._id,
          terminal_id: targetTerminal._id,
          user_id: user._id,
          is_active: true,
          assigned_at: new Date(),
          unassigned_at: null,
          role_name: staff.role,
        },
        { upsert: true, new: true }
      );
      console.log(`🔗 Assigned ${staff.name} (${staff.role}) ➔ ${targetTerminal.terminal_code}`);
    }
  }

  console.log('🎉 Multi-Role Staff & Terminal Seeding Finished Successfully!');
};

// Auto-run if executed directly
if (process.argv[1]?.includes('staff_terminals.seeder')) {
  connectDatabase()
    .then(() => seedMultiRoleStaffAndTerminals())
    .then(() => {
      console.log('Seeder process completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeder failed:', err);
      process.exit(1);
    });
}
