import { Role } from '../../models/Role.js';
import { User } from '../../models/User.js';
import { UserHasRole } from '../../models/UserHasRole.js';
import { Permission } from '../../models/Permission.js';
import { ALL_PERMISSIONS, PERMISSIONS, ROLE_PERMISSIONS, PERMISSION_CATALOG } from '../../config/permissions.js';

export const seedDefaultRoles = async (): Promise<void> => {
  // 1. Seed Permissions Catalog into database idempotently
  console.log('Seeding permission catalog...');
  for (const permDef of PERMISSION_CATALOG) {
    await Permission.findOneAndUpdate(
      { key: permDef.key },
      {
        name: permDef.name,
        key: permDef.key,
        module: permDef.module,
        description: permDef.description,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Seeded ${PERMISSION_CATALOG.length} permissions into database.`);

  // 2. Define standard default roles
  const defaultRoles = [
    {
      name: 'Super Admin',
      slug: 'super-admin',
      description: '<p>Master administrative account with <strong>unrestricted access</strong> across all platform modules, multi-tenant restaurant branches, billing, and system configurations.</p>',
      notes: 'Built-in root administrator role. Cannot be deleted.',
      permissions: ALL_PERMISSIONS,
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Administrator',
      slug: 'administrator',
      description: '<p>Full operational management role for single or multi-unit restaurants including menu, staff, branches, orders, inventory, and reporting.</p>',
      notes: 'Operational restaurant tenant administrator.',
      permissions: ROLE_PERMISSIONS.RESTAURANT_ADMIN,
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Branch Manager',
      slug: 'branch-manager',
      description: '<p>Branch outlet supervisor managing dine-in tables, kitchen dispatch, store staff, and branch reports.</p>',
      notes: 'Branch location operational supervisor.',
      permissions: ROLE_PERMISSIONS.BRANCH_MANAGER,
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Cashier',
      slug: 'cashier',
      description: '<p>Front-desk cashier handling orders, POS billing, tables, and payments.</p>',
      notes: 'Front counter billing & POS operator.',
      permissions: ROLE_PERMISSIONS.CASHIER,
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Kitchen Staff',
      slug: 'kitchen-staff',
      description: '<p>KOT display viewer and kitchen fulfillment staff.</p>',
      notes: 'Kitchen & food prep display operator.',
      permissions: ROLE_PERMISSIONS.KITCHEN_STAFF,
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Waiter',
      slug: 'waiter',
      description: '<p>Floor staff handling table service, order delivery, and order status updates.</p>',
      notes: 'Dining floor & table service operator.',
      permissions: ROLE_PERMISSIONS.WAITER,
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Billing',
      slug: 'billing',
      description: '<p>Cashier and accountant role responsible for finalizing guest checks, processing card & UPI payments, printing bills, and auditing end-of-day revenue.</p>',
      notes: 'POS desk & financial register authority.',
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.ORDER_VIEW,
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.ORDER_CREATE,
        PERMISSIONS.ORDERS_CREATE,
        PERMISSIONS.ORDER_UPDATE,
        PERMISSIONS.ORDERS_UPDATE,
        PERMISSIONS.POS_VIEW,
        PERMISSIONS.POS_CREATE_ORDER,
        PERMISSIONS.POS_PAYMENT,
        PERMISSIONS.CUSTOMER_VIEW,
        PERMISSIONS.TABLE_VIEW,
        PERMISSIONS.REPORT_VIEW,
      ],
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Support Agent',
      slug: 'support-agent',
      description: '<p>Customer support and order helpdesk specialist capable of viewing customer profiles, looking up live orders, and updating ticket statuses.</p>',
      notes: 'First-line order dispute & customer enquiry agent.',
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.ORDER_VIEW,
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.CUSTOMER_VIEW,
        PERMISSIONS.CUSTOMER_MANAGE,
        PERMISSIONS.REPORT_VIEW,
      ],
      isDefault: true,
      isActive: true,
    },
  ];

  console.log('Seeding default roles...');
  for (const roleData of defaultRoles) {
    const existing = await Role.findOne({ slug: roleData.slug });
    if (!existing) {
      await Role.create(roleData);
      console.log(`Created default role: ${roleData.name} (${roleData.slug})`);
    } else {
      // Do not erase administrator-configured custom role assignments
      existing.isDefault = true;
      existing.description = roleData.description;
      existing.notes = roleData.notes;
      if (!existing.permissions || existing.permissions.length === 0) {
        existing.permissions = roleData.permissions;
      }
      await existing.save();
    }
  }

  // Link existing Super Admin user to the Super Admin role in UserHasRole
  const superAdminRole = await Role.findOne({ slug: 'super-admin' });
  const superAdminUser = await User.findOne({ role: 'SUPER_ADMIN' });
  if (superAdminRole && superAdminUser) {
    await UserHasRole.findOneAndUpdate(
      { userId: superAdminUser._id, roleId: superAdminRole._id },
      { userId: superAdminUser._id, roleId: superAdminRole._id },
      { upsert: true, new: true }
    );
    console.log(`Linked Super Admin user (${superAdminUser.email}) to role (${superAdminRole.slug}) in UserHasRole.`);
  }

  // Link or create demo users for Cashier, Kitchen, and Waiter if needed
  const demoAccounts = [
    {
      email: 'cashier@dalghar.com',
      name: 'Dal Ghar Cashier',
      slug: 'cashier',
      role: 'CASHIER',
    },
    {
      email: 'kitchen@dalghar.com',
      name: 'Dal Ghar Kitchen Chef',
      slug: 'kitchen-staff',
      role: 'KITCHEN_STAFF',
    },
    {
      email: 'waiter@dalghar.com',
      name: 'Dal Ghar Waiter',
      slug: 'waiter',
      role: 'WAITER',
    },
  ];

  for (const demo of demoAccounts) {
    const roleDoc = await Role.findOne({ slug: demo.slug });
    if (!roleDoc) continue;

    let userDoc = await User.findOne({ email: demo.email });
    if (!userDoc) {
      const bcrypt = (await import('bcryptjs')).default;
      const passwordHash = await bcrypt.hash('Staff@123', 10);
      userDoc = await User.create({
        name: demo.name,
        email: demo.email,
        passwordHash,
        role: demo.role,
        isActive: true,
        restaurantId: null,
        branchId: null,
        permissions: roleDoc.permissions,
      });
      console.log(`Created demo staff user: ${demo.email}`);
    }

    await UserHasRole.findOneAndUpdate(
      { userId: userDoc._id, roleId: roleDoc._id },
      { userId: userDoc._id, roleId: roleDoc._id },
      { upsert: true, new: true }
    );
  }

  console.log('Default roles & permissions seeding completed.');
};
