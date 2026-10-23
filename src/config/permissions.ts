import { UserRole } from '../models/User.js';

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Users & Staff
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_ASSIGN_ROLES: 'users.assign_roles',

  // Roles & Permissions
  ROLE_VIEW: 'role.view',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_ASSIGN_PERMISSIONS: 'roles.assign_permissions',

  // Restaurants
  RESTAURANT_VIEW: 'restaurant.view',
  RESTAURANT_CREATE: 'restaurant.create',
  RESTAURANT_UPDATE: 'restaurant.update',
  RESTAURANT_DELETE: 'restaurant.delete',
  RESTAURANTS_VIEW: 'restaurants.view',
  RESTAURANTS_CREATE: 'restaurants.create',
  RESTAURANTS_UPDATE: 'restaurants.update',
  RESTAURANTS_DELETE: 'restaurants.delete',

  // Branches
  BRANCH_VIEW: 'branch.view',
  BRANCH_CREATE: 'branch.create',
  BRANCH_UPDATE: 'branch.update',
  BRANCH_DELETE: 'branch.delete',
  BRANCHES_VIEW: 'branches.view',
  BRANCHES_CREATE: 'branches.create',
  BRANCHES_UPDATE: 'branches.update',
  BRANCHES_DELETE: 'branches.delete',

  // Menu
  MENU_VIEW: 'menu.view',
  MENU_CREATE: 'menu.create',
  MENU_UPDATE: 'menu.update',
  MENU_DELETE: 'menu.delete',

  // Orders
  ORDER_VIEW: 'order.view',
  ORDER_CREATE: 'order.create',
  ORDER_UPDATE: 'order.update',
  ORDER_CANCEL: 'order.cancel',
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_SEND_TO_KITCHEN: 'orders.send_to_kitchen',

  // Kitchen Display System (KDS)
  KITCHEN_ORDERS_VIEW: 'kitchen.orders.view',
  KITCHEN_ORDERS_ACCEPT: 'kitchen.orders.accept',
  KITCHEN_ORDERS_UPDATE_STATUS: 'kitchen.orders.update_status',

  // Waiter Service
  WAITER_ORDERS_VIEW: 'waiter.orders.view',
  WAITER_ORDERS_ACCEPT: 'waiter.orders.accept',
  WAITER_ORDERS_MARK_SERVED: 'waiter.orders.mark_served',

  // POS & Payments
  POS_VIEW: 'pos.view',
  POS_CREATE_ORDER: 'pos.create_order',
  POS_PAYMENT: 'pos.payment',
  POS_SHIFTS_VIEW: 'pos.shifts.view',
  POS_SHIFTS_OPEN: 'pos.shifts.open',
  POS_SHIFTS_CLOSE: 'pos.shifts.close',
  POS_SHIFTS_RECONCILE: 'pos.shifts.reconcile',
  POS_AUDIT_READ: 'pos.audit.read',

  // Dining Tables & Areas
  TABLE_VIEW: 'table.view',
  TABLE_MANAGE: 'table.manage',
  DINING_TABLES_VIEW: 'dining.tables.view',
  DINING_TABLES_MANAGE: 'dining.tables.manage',

  // Reservations & Waitlist
  RESERVATIONS_VIEW: 'reservations.view',
  RESERVATIONS_CREATE: 'reservations.create',
  RESERVATIONS_UPDATE: 'reservations.update',
  RESERVATIONS_CANCEL: 'reservations.cancel',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',

  // Customers
  CUSTOMER_VIEW: 'customer.view',
  CUSTOMER_MANAGE: 'customer.manage',

  // Marketing Campaigns
  CAMPAIGNS_VIEW: 'campaigns.view',
  CAMPAIGNS_MANAGE: 'campaigns.manage',

  // Email Templates
  EMAIL_TEMPLATES_VIEW: 'email_templates.view',
  EMAIL_TEMPLATES_MANAGE: 'email_templates.manage',

  // Reports
  REPORT_VIEW: 'report.view',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | '*';

export interface PermissionDefinition {
  name: string;
  key: string;
  module: string;
  description: string;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // Dashboard
  { name: 'View Dashboard', key: PERMISSIONS.DASHBOARD_VIEW, module: 'dashboard', description: 'View executive sales overview, charts, and metrics' },

  // Users & Staff
  { name: 'View Users', key: PERMISSIONS.STAFF_VIEW, module: 'users', description: 'View staff employee list and details' },
  { name: 'Manage Users', key: PERMISSIONS.STAFF_MANAGE, module: 'users', description: 'Create, update, activate, and deactivate staff accounts' },
  { name: 'View Users List', key: PERMISSIONS.USERS_VIEW, module: 'users', description: 'Access user accounts listing' },
  { name: 'Create Users', key: PERMISSIONS.USERS_CREATE, module: 'users', description: 'Register new system users and employees' },
  { name: 'Update Users', key: PERMISSIONS.USERS_UPDATE, module: 'users', description: 'Modify employee profile, branches, and statuses' },
  { name: 'Delete Users', key: PERMISSIONS.USERS_DELETE, module: 'users', description: 'Remove employee accounts from the database' },
  { name: 'Assign User Roles', key: PERMISSIONS.USERS_ASSIGN_ROLES, module: 'users', description: 'Assign or reassign roles to user accounts' },

  // Roles & Permissions
  { name: 'View Roles', key: PERMISSIONS.ROLE_VIEW, module: 'roles', description: 'View system roles and permission configurations' },
  { name: 'Create Roles', key: PERMISSIONS.ROLE_CREATE, module: 'roles', description: 'Create custom roles with defined capabilities' },
  { name: 'Update Roles', key: PERMISSIONS.ROLE_UPDATE, module: 'roles', description: 'Update role details and permissions' },
  { name: 'Delete Roles', key: PERMISSIONS.ROLE_DELETE, module: 'roles', description: 'Delete non-system custom roles' },
  { name: 'Assign Permissions', key: PERMISSIONS.ROLES_ASSIGN_PERMISSIONS, module: 'roles', description: 'Grant or revoke permissions assigned to roles' },

  // Restaurants
  { name: 'View Restaurants', key: PERMISSIONS.RESTAURANT_VIEW, module: 'restaurants', description: 'View restaurant entities and settings' },
  { name: 'Create Restaurants', key: PERMISSIONS.RESTAURANT_CREATE, module: 'restaurants', description: 'Register new restaurant brands' },
  { name: 'Update Restaurants', key: PERMISSIONS.RESTAURANT_UPDATE, module: 'restaurants', description: 'Update restaurant information and configuration' },
  { name: 'Delete Restaurants', key: PERMISSIONS.RESTAURANT_DELETE, module: 'restaurants', description: 'Remove restaurant entities' },

  // Branches
  { name: 'View Branches', key: PERMISSIONS.BRANCH_VIEW, module: 'branches', description: 'View restaurant branch outlets' },
  { name: 'Create Branches', key: PERMISSIONS.BRANCH_CREATE, module: 'branches', description: 'Add new restaurant branch locations' },
  { name: 'Update Branches', key: PERMISSIONS.BRANCH_UPDATE, module: 'branches', description: 'Edit branch details, tax IDs, and operational timings' },
  { name: 'Delete Branches', key: PERMISSIONS.BRANCH_DELETE, module: 'branches', description: 'Remove branch locations' },

  // Menu
  { name: 'View Menu', key: PERMISSIONS.MENU_VIEW, module: 'menu', description: 'View menus, categories, and food catalog' },
  { name: 'Create Menu Items', key: PERMISSIONS.MENU_CREATE, module: 'menu', description: 'Create food items, categories, and pricing' },
  { name: 'Update Menu Items', key: PERMISSIONS.MENU_UPDATE, module: 'menu', description: 'Edit recipes, prices, and item availability' },
  { name: 'Delete Menu Items', key: PERMISSIONS.MENU_DELETE, module: 'menu', description: 'Remove dishes and categories from menu' },

  // Orders
  { name: 'View Orders', key: PERMISSIONS.ORDER_VIEW, module: 'orders', description: 'View dine-in, takeaway, and delivery orders' },
  { name: 'Create Orders', key: PERMISSIONS.ORDER_CREATE, module: 'orders', description: 'Place and punch new food orders' },
  { name: 'Update Orders', key: PERMISSIONS.ORDER_UPDATE, module: 'orders', description: 'Modify orders, add items, and adjust totals' },
  { name: 'Cancel Orders', key: PERMISSIONS.ORDER_CANCEL, module: 'orders', description: 'Void or cancel active orders' },
  { name: 'Send to Kitchen', key: PERMISSIONS.ORDERS_SEND_TO_KITCHEN, module: 'orders', description: 'Dispatch orders to the kitchen KDS display' },

  // Kitchen KDS
  { name: 'View Kitchen Display', key: PERMISSIONS.KITCHEN_ORDERS_VIEW, module: 'kitchen', description: 'View incoming kitchen display orders and tickets' },
  { name: 'Accept Kitchen Orders', key: PERMISSIONS.KITCHEN_ORDERS_ACCEPT, module: 'kitchen', description: 'Accept and start preparing kitchen tickets' },
  { name: 'Update Kitchen Preparation Status', key: PERMISSIONS.KITCHEN_ORDERS_UPDATE_STATUS, module: 'kitchen', description: 'Mark orders as Preparing, Ready, or Completed' },

  // Waiter Service
  { name: 'View Waiter Service Orders', key: PERMISSIONS.WAITER_ORDERS_VIEW, module: 'waiter', description: 'View orders ready for table delivery' },
  { name: 'Accept Waiter Delivery', key: PERMISSIONS.WAITER_ORDERS_ACCEPT, module: 'waiter', description: 'Pick up food tickets for table service' },
  { name: 'Mark Orders as Served', key: PERMISSIONS.WAITER_ORDERS_MARK_SERVED, module: 'waiter', description: 'Mark food items as served to guest tables' },

  // POS & Payments
  { name: 'Access POS Terminal', key: PERMISSIONS.POS_VIEW, module: 'pos', description: 'Access and operate cashier POS terminals' },
  { name: 'Create POS Orders', key: PERMISSIONS.POS_CREATE_ORDER, module: 'pos', description: 'Punch POS checkouts and print guest bills' },
  { name: 'Process Payments', key: PERMISSIONS.POS_PAYMENT, module: 'pos', description: 'Collect cash, card, UPI payments and settle bills' },
  { name: 'View POS Shifts', key: PERMISSIONS.POS_SHIFTS_VIEW, module: 'pos', description: 'View cashier shift logs and register histories' },
  { name: 'Open POS Shift', key: PERMISSIONS.POS_SHIFTS_OPEN, module: 'pos', description: 'Open cashier shift session and input opening float' },
  { name: 'Close POS Shift', key: PERMISSIONS.POS_SHIFTS_CLOSE, module: 'pos', description: 'Close cashier shift and input counted cash' },
  { name: 'Reconcile Shifts', key: PERMISSIONS.POS_SHIFTS_RECONCILE, module: 'pos', description: 'Perform denomination audits and variance approvals' },
  { name: 'Read POS Audit Logs', key: PERMISSIONS.POS_AUDIT_READ, module: 'pos', description: 'Audit security events, drawer openings, and overrides' },

  // Dining Tables & Areas
  { name: 'View Dining Tables', key: PERMISSIONS.TABLE_VIEW, module: 'dining', description: 'View dining floor layout, sections, and tables' },
  { name: 'Manage Dining Tables', key: PERMISSIONS.TABLE_MANAGE, module: 'dining', description: 'Create, edit, merge tables and configure floor plans' },

  // Reservations
  { name: 'View Reservations', key: PERMISSIONS.RESERVATIONS_VIEW, module: 'reservations', description: 'View upcoming table bookings and waitlists' },
  { name: 'Create Reservations', key: PERMISSIONS.RESERVATIONS_CREATE, module: 'reservations', description: 'Book guest tables and add to waitlist' },
  { name: 'Update Reservations', key: PERMISSIONS.RESERVATIONS_UPDATE, module: 'reservations', description: 'Reschedule or modify guest party size' },
  { name: 'Cancel Reservations', key: PERMISSIONS.RESERVATIONS_CANCEL, module: 'reservations', description: 'Cancel bookings or mark no-shows' },

  // Inventory
  { name: 'View Inventory', key: PERMISSIONS.INVENTORY_VIEW, module: 'inventory', description: 'View raw material ingredients and stock levels' },
  { name: 'Manage Inventory', key: PERMISSIONS.INVENTORY_MANAGE, module: 'inventory', description: 'Adjust inventory, log wastage, and receive purchase stock' },

  // Customers
  { name: 'View Customers', key: PERMISSIONS.CUSTOMER_VIEW, module: 'customers', description: 'View customer directory and visit histories' },
  { name: 'Manage Customers', key: PERMISSIONS.CUSTOMER_MANAGE, module: 'customers', description: 'Create and update customer profiles and loyalty' },

  // Campaigns
  { name: 'View Campaigns', key: PERMISSIONS.CAMPAIGNS_VIEW, module: 'campaigns', description: 'View marketing campaigns and promotional offers' },
  { name: 'Manage Campaigns', key: PERMISSIONS.CAMPAIGNS_MANAGE, module: 'campaigns', description: 'Create and launch marketing discount promotions' },

  // Email Templates
  { name: 'View Email Templates', key: PERMISSIONS.EMAIL_TEMPLATES_VIEW, module: 'email-templates', description: 'View email templates used by system triggers' },
  { name: 'Manage Email Templates', key: PERMISSIONS.EMAIL_TEMPLATES_MANAGE, module: 'email-templates', description: 'Create and edit email content and styles' },

  // Reports
  { name: 'View Reports', key: PERMISSIONS.REPORT_VIEW, module: 'reports', description: 'Generate and export sales, tax, and revenue reports' },

  // Settings
  { name: 'View Settings', key: PERMISSIONS.SETTINGS_VIEW, module: 'settings', description: 'View system and branch settings' },
  { name: 'Manage Settings', key: PERMISSIONS.SETTINGS_MANAGE, module: 'settings', description: 'Update hardware peripherals, receipt templates, and numbering series' },
];

export const ALL_PERMISSIONS: string[] = Array.from(
  new Set(PERMISSION_CATALOG.map((p) => p.key))
);

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  RESTAURANT_ADMIN: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_MANAGE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_ASSIGN_ROLES,
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.BRANCH_CREATE,
    PERMISSIONS.BRANCH_UPDATE,
    PERMISSIONS.BRANCH_DELETE,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_CREATE,
    PERMISSIONS.MENU_UPDATE,
    PERMISSIONS.MENU_DELETE,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDER_CANCEL,
    PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.ORDERS_SEND_TO_KITCHEN,
    PERMISSIONS.KITCHEN_ORDERS_VIEW,
    PERMISSIONS.KITCHEN_ORDERS_ACCEPT,
    PERMISSIONS.KITCHEN_ORDERS_UPDATE_STATUS,
    PERMISSIONS.WAITER_ORDERS_VIEW,
    PERMISSIONS.WAITER_ORDERS_ACCEPT,
    PERMISSIONS.WAITER_ORDERS_MARK_SERVED,
    PERMISSIONS.POS_VIEW,
    PERMISSIONS.POS_CREATE_ORDER,
    PERMISSIONS.POS_PAYMENT,
    PERMISSIONS.POS_SHIFTS_VIEW,
    PERMISSIONS.POS_AUDIT_READ,
    PERMISSIONS.TABLE_VIEW,
    PERMISSIONS.TABLE_MANAGE,
    PERMISSIONS.DINING_TABLES_VIEW,
    PERMISSIONS.DINING_TABLES_MANAGE,
    PERMISSIONS.RESERVATIONS_VIEW,
    PERMISSIONS.RESERVATIONS_CREATE,
    PERMISSIONS.RESERVATIONS_UPDATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CUSTOMER_MANAGE,
    PERMISSIONS.CAMPAIGNS_VIEW,
    PERMISSIONS.CAMPAIGNS_MANAGE,
    PERMISSIONS.EMAIL_TEMPLATES_VIEW,
    PERMISSIONS.EMAIL_TEMPLATES_MANAGE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
  ],
  BRANCH_MANAGER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_SEND_TO_KITCHEN,
    PERMISSIONS.KITCHEN_ORDERS_VIEW,
    PERMISSIONS.KITCHEN_ORDERS_ACCEPT,
    PERMISSIONS.KITCHEN_ORDERS_UPDATE_STATUS,
    PERMISSIONS.WAITER_ORDERS_VIEW,
    PERMISSIONS.WAITER_ORDERS_ACCEPT,
    PERMISSIONS.WAITER_ORDERS_MARK_SERVED,
    PERMISSIONS.POS_VIEW,
    PERMISSIONS.POS_CREATE_ORDER,
    PERMISSIONS.POS_PAYMENT,
    PERMISSIONS.POS_SHIFTS_VIEW,
    PERMISSIONS.POS_SHIFTS_OPEN,
    PERMISSIONS.POS_SHIFTS_CLOSE,
    PERMISSIONS.POS_SHIFTS_RECONCILE,
    PERMISSIONS.POS_AUDIT_READ,
    PERMISSIONS.TABLE_VIEW,
    PERMISSIONS.TABLE_MANAGE,
    PERMISSIONS.DINING_TABLES_VIEW,
    PERMISSIONS.DINING_TABLES_MANAGE,
    PERMISSIONS.RESERVATIONS_VIEW,
    PERMISSIONS.RESERVATIONS_CREATE,
    PERMISSIONS.RESERVATIONS_UPDATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],
  CASHIER: [
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_SEND_TO_KITCHEN,
    PERMISSIONS.POS_VIEW,
    PERMISSIONS.POS_CREATE_ORDER,
    PERMISSIONS.POS_PAYMENT,
    PERMISSIONS.POS_SHIFTS_VIEW,
    PERMISSIONS.POS_SHIFTS_OPEN,
    PERMISSIONS.POS_SHIFTS_CLOSE,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.TABLE_VIEW,
    PERMISSIONS.DINING_TABLES_VIEW,
  ],
  KITCHEN_STAFF: [
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.KITCHEN_ORDERS_VIEW,
    PERMISSIONS.KITCHEN_ORDERS_ACCEPT,
    PERMISSIONS.KITCHEN_ORDERS_UPDATE_STATUS,
  ],
  WAITER: [
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.WAITER_ORDERS_VIEW,
    PERMISSIONS.WAITER_ORDERS_ACCEPT,
    PERMISSIONS.WAITER_ORDERS_MARK_SERVED,
    PERMISSIONS.TABLE_VIEW,
    PERMISSIONS.DINING_TABLES_VIEW,
  ],
};
