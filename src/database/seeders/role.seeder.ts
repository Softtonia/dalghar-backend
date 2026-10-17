import { Role } from '../../models/Role.js';
import { User } from '../../models/User.js';
import { UserHasRole } from '../../models/UserHasRole.js';
import { ALL_PERMISSIONS, PERMISSIONS, ROLE_PERMISSIONS } from '../../config/permissions.js';

export const seedDefaultRoles = async (): Promise<void> => {
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
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.RESTAURANT_VIEW,
        PERMISSIONS.BRANCH_VIEW,
        PERMISSIONS.BRANCH_CREATE,
        PERMISSIONS.BRANCH_UPDATE,
        PERMISSIONS.MENU_VIEW,
        PERMISSIONS.MENU_CREATE,
        PERMISSIONS.MENU_UPDATE,
        PERMISSIONS.MENU_DELETE,
        PERMISSIONS.ORDER_VIEW,
        PERMISSIONS.ORDER_CREATE,
        PERMISSIONS.ORDER_UPDATE,
        PERMISSIONS.ORDER_CANCEL,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_MANAGE,
        PERMISSIONS.CUSTOMER_VIEW,
        PERMISSIONS.CUSTOMER_MANAGE,
        PERMISSIONS.STAFF_VIEW,
        PERMISSIONS.STAFF_MANAGE,
        PERMISSIONS.ROLE_VIEW,
        PERMISSIONS.TABLE_VIEW,
        PERMISSIONS.TABLE_MANAGE,
        PERMISSIONS.REPORT_VIEW,
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.SETTINGS_MANAGE,
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
        PERMISSIONS.CUSTOMER_VIEW,
        PERMISSIONS.CUSTOMER_MANAGE,
        PERMISSIONS.REPORT_VIEW,
      ],
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
        PERMISSIONS.ORDER_CREATE,
        PERMISSIONS.ORDER_UPDATE,
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
      name: 'Technical',
      slug: 'technical',
      description: '<p>IT hardware, POS thermal printer integration, API settings, and branch telemetry administrator.</p>',
      notes: 'Hardware configuration & system connectivity engineer.',
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.RESTAURANT_VIEW,
        PERMISSIONS.BRANCH_VIEW,
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.SETTINGS_MANAGE,
        PERMISSIONS.ROLE_VIEW,
      ],
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Reseller',
      slug: 'reseller',
      description: '<p>Channel partner and white-label distributor managing sub-restaurant tenant accounts and onboarding new restaurant franchises.</p>',
      notes: 'Commercial sales partner & tenant provisioner.',
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.RESTAURANT_VIEW,
        PERMISSIONS.RESTAURANT_CREATE,
        PERMISSIONS.RESTAURANT_UPDATE,
        PERMISSIONS.BRANCH_VIEW,
        PERMISSIONS.REPORT_VIEW,
      ],
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Client',
      slug: 'client',
      description: '<p>External restaurant owner/franchisee viewer with executive overview of sales dashboards, orders, and branch metrics.</p>',
      notes: 'Executive stakeholder viewer role.',
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.RESTAURANT_VIEW,
        PERMISSIONS.BRANCH_VIEW,
        PERMISSIONS.ORDER_VIEW,
        PERMISSIONS.REPORT_VIEW,
      ],
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
  ];

  console.log('Seeding default roles...');
  for (const roleData of defaultRoles) {
    const existing = await Role.findOne({ slug: roleData.slug });
    if (!existing) {
      await Role.create(roleData);
      console.log(`Created default role: ${roleData.name} (${roleData.slug})`);
    } else {
      // Ensure default flag and name stay updated
      existing.isDefault = true;
      existing.description = roleData.description;
      existing.notes = roleData.notes;
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

  // Create demo Support Agent user if not present and link to support-agent role
  const supportRole = await Role.findOne({ slug: 'support-agent' });
  if (supportRole) {
    const supportEmail = 'dalgharsupport@yopmail.com';
    let supportUser = await User.findOne({ email: supportEmail });
    if (!supportUser) {
      const bcrypt = (await import('bcryptjs')).default;
      const passwordHash = await bcrypt.hash('Support@123', 10);
      supportUser = await User.create({
        name: 'Dal Ghar Support Agent',
        email: supportEmail,
        passwordHash,
        role: 'BRANCH_MANAGER',
        isActive: true,
        restaurantId: null,
        branchId: null,
        permissions: supportRole.permissions,
      });
      console.log(`Created Support Agent user: ${supportEmail}`);
    }

    await UserHasRole.findOneAndUpdate(
      { userId: supportUser._id, roleId: supportRole._id },
      { userId: supportUser._id, roleId: supportRole._id },
      { upsert: true, new: true }
    );
    console.log(`Linked Support Agent user (${supportEmail}) to role (${supportRole.slug}) in UserHasRole.`);
  }

  console.log('Default roles seeding completed.');
};
