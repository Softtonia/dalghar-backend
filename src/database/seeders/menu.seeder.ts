import mongoose, { Types } from 'mongoose';
import { User } from '../../models/User.js';
import { Restaurant } from '../../models/Restaurant.js';
import { Branch } from '../../models/Branch.js';
import { PosTerminal } from '../../models/PosTerminal.js';
import { Menu } from '../../models/Menu.js';
import { MenuCategory } from '../../models/MenuCategory.js';
import { MenuItem } from '../../models/MenuItem.js';
import { AddonGroup } from '../../models/AddonGroup.js';
import { MenuRestaurantAssignment } from '../../models/MenuRestaurantAssignment.js';
import { MenuBranchAssignment } from '../../models/MenuBranchAssignment.js';

export const seedMenuAndCatalog = async (): Promise<void> => {
  console.log('🍛 Starting Menu, Categories, Addons & Catalog seeding...');

  // 1. Get or create Admin user for createdBy references
  let adminUser = await User.findOne({ role: 'SUPER_ADMIN' }) || await User.findOne();
  if (!adminUser) {
    console.log('Creating fallback admin user for menu references...');
    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@dalghar.com',
      passwordHash: '$2b$10$YourHashedPasswordHereFallback12345678901234567890',
      role: 'SUPER_ADMIN',
      isActive: true,
      permissions: ['*'],
    });
  }
  const userId = adminUser._id as Types.ObjectId;

  // 2. Find or create default Restaurant
  let restaurant = await Restaurant.findOne();
  if (!restaurant) {
    console.log('Seeding default Restaurant: Dal Ghar Royal Dining...');
    restaurant = await Restaurant.create({
      name: 'Dal Ghar Royal Dining',
      slug: 'dal-ghar-royal-dining',
      code: 'DG-MAIN',
      logo: { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400', publicId: null },
      contact: { phone: '+91 98765 43210', email: 'contact@dalghar.com', website: 'https://dalghar.com' },
      address: {
        addressLine1: 'Heritage Plaza, MG Road',
        addressLine2: 'Civil Lines',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      business: { legalName: 'Dal Ghar Foods Pvt Ltd', gstin: '27AABCT3518Q1ZV', pan: 'AABCT3518Q', businessType: 'RESTAURANT' },
      configuration: { currency: 'INR', timezone: 'Asia/Kolkata', taxEnabled: true, defaultTaxRate: 5 },
      operatingStatus: 'ACTIVE',
      createdBy: userId,
      updatedBy: userId,
    });
  }

  // 3. Find or create default Branch
  let branch = await Branch.findOne({ restaurantId: restaurant._id }) || await Branch.findOne();
  if (!branch) {
    console.log('Seeding default Branch: Flagship Outlet...');
    branch = await Branch.create({
      restaurantId: restaurant._id,
      name: 'Dal Ghar - Flagship Outlet',
      code: 'DG-B01',
      slug: 'dal-ghar-flagship-outlet',
      type: 'MAIN' as any,
      contact: { phone: '+91 98765 43211', email: 'flagship@dalghar.com', managerName: 'Rajesh Sharma', managerPhone: '+91 98765 43212' },
      address: {
        addressLine1: 'Shop 101-104, Ground Floor',
        addressLine2: 'Crystal Mall, Linking Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        country: 'India',
      },
      configuration: { currency: 'INR', timezone: 'Asia/Kolkata', taxEnabled: true, defaultTaxRate: 5 },
      operatingStatus: 'ACTIVE',
      createdBy: userId,
      updatedBy: userId,
    });
  }

  // 4. Ensure at least one active POS Terminal exists for the branch
  let terminal = await PosTerminal.findOne({ branch_id: branch._id });
  if (!terminal) {
    console.log('Seeding default POS Terminal: Counter POS-01...');
    terminal = await PosTerminal.create({
      restaurant_id: restaurant._id,
      branch_id: branch._id,
      terminal_code: 'POS-01',
      terminal_name: 'Main Cashier Terminal 1',
      name: 'Main Cashier Terminal 1',
      device_type: 'desktop',
      operating_system: 'Windows 11 Pro',
      status: 'active',
      connectivity_status: 'online',
      settings: {
        auto_print_receipt: true,
        auto_print_kitchen_ticket: true,
        require_shift_before_sales: true,
        allow_cash_sales: true,
        allow_card_sales: true,
      },
      created_by: userId,
    });
  }

  // 5. Create or find Master Menus
  console.log('Seeding Master Menus...');
  const menuDefinitions: any[] = [
    {
      name: 'All Day Dine-In Menu',
      code: 'MENU-ALLDAY',
      description: 'Complete royal Mughlai & North Indian dining menu available round the clock.',
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600',
      cuisine: 'North Indian & Awadhi',
      menuType: ['dine_in', 'takeaway'],
      mealPeriod: 'all_day',
      status: 'published',
      isPublished: true,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Dinner Special Handi Delights',
      code: 'MENU-DINNER',
      description: 'Slow-cooked handi curries, charcoal grilled kebabs and royal platters.',
      imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600',
      cuisine: 'Mughlai & Punjabi',
      menuType: ['dine_in', 'takeaway', 'delivery'],
      mealPeriod: 'dinner',
      status: 'published',
      isPublished: true,
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'Beverages & Royal Desserts',
      code: 'MENU-BEV',
      description: 'Traditional churned lassis, spiced chaas, and artisanal sweet delights.',
      imageUrl: 'https://images.unsplash.com/photo-1571006687898-1e42a048a176?w=600',
      cuisine: 'Desserts & Beverages',
      menuType: ['dine_in', 'takeaway'],
      mealPeriod: 'all_day',
      status: 'published',
      isPublished: true,
      sortOrder: 3,
      isActive: true,
    },
  ];

  const seededMenus: any[] = [];
  for (const mDef of menuDefinitions) {
    let m = await Menu.findOne({ code: mDef.code });
    if (!m) {
      m = await Menu.create({
        ...mDef,
        createdBy: userId,
        updatedBy: userId,
      });
    } else {
      await Menu.updateOne({ _id: m._id }, { $set: { isPublished: true, status: 'published', isActive: true } });
    }
    seededMenus.push(m);

    // Assign to Restaurant and Branch
    await MenuRestaurantAssignment.findOneAndUpdate(
      { menuId: m._id, restaurantId: restaurant._id },
      { $set: { status: 'active', assignedBy: userId } },
      { upsert: true }
    );
    await MenuBranchAssignment.findOneAndUpdate(
      { menuId: m._id, branchId: branch._id },
      { $set: { restaurantId: restaurant._id, status: 'ACTIVE', assignedBy: userId } },
      { upsert: true }
    );
  }

  const primaryMenu = seededMenus[0];
  const dinnerMenu = seededMenus[1];
  const bevMenu = seededMenus[2];

  // 6. Create or find Menu Categories
  console.log('Seeding Menu Categories...');
  const categoryDefinitions = [
    { name: 'Dal & Curries', code: 'CAT-DAL', menuId: primaryMenu._id, displayOrder: 1, description: 'Creamy slow-cooked dals and rich aromatic gravies' },
    { name: 'Tandoor & Breads', code: 'CAT-BREAD', menuId: primaryMenu._id, displayOrder: 2, description: 'Freshly baked tandoori rotis, naans and parathas' },
    { name: 'Rice & Biryani', code: 'CAT-RICE', menuId: primaryMenu._id, displayOrder: 3, description: 'Fragrant aged basmati preparations and handi biryanis' },
    { name: 'Starters & Tandoor', code: 'CAT-START', menuId: dinnerMenu._id, displayOrder: 4, description: 'Charcoal grilled kebabs, tikkas and crispy platters' },
    { name: 'Beverages & Drinks', code: 'CAT-BEV', menuId: bevMenu._id, displayOrder: 5, description: 'Thick creamy lassis, chaas and refreshing cooler drinks' },
    { name: 'Desserts & Sweets', code: 'CAT-DES', menuId: bevMenu._id, displayOrder: 6, description: 'Royal Indian halwas, gulab jamun and rabdi' },
  ];

  const seededCategories: Record<string, any> = {};
  for (const cDef of categoryDefinitions) {
    let cat = await MenuCategory.findOne({ name: cDef.name });
    if (!cat) {
      cat = await MenuCategory.create({
        ...cDef,
        status: 'active',
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      });
    } else {
      await MenuCategory.updateOne({ _id: cat._id }, { $set: { menuId: cDef.menuId, status: 'active', isActive: true } });
    }
    seededCategories[cDef.name] = cat;
  }

  // 7. Create or find Customization Addon Groups
  console.log('Seeding Addon & Customization Groups...');
  const addonGroupDefs = [
    {
      name: 'Choice of Bread / Roti',
      description: 'Select your preferred Indian bread accompaniment',
      selection_type: 'single' as const,
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      status: 'active' as const,
      options: [
        { name: 'Butter Tandoori Roti', price: 30, isDefault: true, status: 'active' as const },
        { name: 'Garlic Butter Naan', price: 60, isDefault: false, status: 'active' as const },
        { name: 'Plain Naan', price: 40, isDefault: false, status: 'active' as const },
        { name: 'Laccha Paratha', price: 50, isDefault: false, status: 'active' as const },
        { name: 'Missi Roti', price: 45, isDefault: false, status: 'active' as const },
      ],
    },
    {
      name: 'Spice Level Customization',
      description: 'Choose your desired gravy chili level',
      selection_type: 'single' as const,
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      status: 'active' as const,
      options: [
        { name: 'Mild (Child Friendly)', price: 0, isDefault: false, status: 'active' as const },
        { name: 'Medium Spicy (Chef Standard)', price: 0, isDefault: true, status: 'active' as const },
        { name: 'Extra Spicy (Kolhapuri Tadka)', price: 15, isDefault: false, status: 'active' as const },
        { name: 'Desi Ghee Chaunk Extra', price: 30, isDefault: false, status: 'active' as const },
      ],
    },
    {
      name: 'Extra Dal Tadka & Toppings',
      description: 'Gourmet toppings and rich accompaniments',
      selection_type: 'multiple' as const,
      is_required: false,
      min_selections: 0,
      max_selections: 3,
      status: 'active' as const,
      options: [
        { name: 'Double Amul Butter Dollop', price: 25, isDefault: false, status: 'active' as const },
        { name: 'Roasted Garlic & Heeng Chaunk', price: 20, isDefault: false, status: 'active' as const },
        { name: 'Grated Malai Paneer Garnish', price: 35, isDefault: false, status: 'active' as const },
        { name: 'Crispy Roasted Papad & Sirka Onions', price: 30, isDefault: false, status: 'active' as const },
      ],
    },
    {
      name: 'Beverage Sweetness & Chill',
      description: 'Sweetness and ice preference for drinks',
      selection_type: 'single' as const,
      is_required: false,
      min_selections: 0,
      max_selections: 1,
      status: 'active' as const,
      options: [
        { name: 'Regular Sweet (Chef Blend)', price: 0, isDefault: true, status: 'active' as const },
        { name: 'Low Sugar', price: 0, isDefault: false, status: 'active' as const },
        { name: 'Sugar Free (Stevia)', price: 15, isDefault: false, status: 'active' as const },
        { name: 'Extra Chilled with Crushed Ice', price: 0, isDefault: false, status: 'active' as const },
      ],
    },
  ];

  const seededAddonGroups: Record<string, any> = {};
  for (const agDef of addonGroupDefs) {
    let group = await AddonGroup.findOne({ name: agDef.name });
    if (!group) {
      group = await AddonGroup.create({
        ...agDef,
        restaurantId: restaurant._id,
        menuId: primaryMenu._id,
        createdBy: userId,
        updatedBy: userId,
      });
    } else {
      await AddonGroup.updateOne({ _id: group._id }, { $set: { options: agDef.options, status: 'active' } });
    }
    seededAddonGroups[agDef.name] = group;
  }

  // 8. Seed Rich Menu Items
  console.log('Seeding Menu Items with Addons, Variants & Customization...');
  const breadGroup = seededAddonGroups['Choice of Bread / Roti'];
  const spiceGroup = seededAddonGroups['Spice Level Customization'];
  const toppingGroup = seededAddonGroups['Extra Dal Tadka & Toppings'];
  const drinkGroup = seededAddonGroups['Beverage Sweetness & Chill'];

  const menuItemsData = [
    {
      name: 'Dal Ghar Signature Dal Makhani',
      code: 'DG-DM01',
      category: 'Dal & Curries',
      categoryId: seededCategories['Dal & Curries']?._id,
      menuId: primaryMenu._id,
      itemType: 'VEG' as const,
      price: 240,
      discountPrice: 220,
      preparationTime: 15,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600',
      description: 'Slow-cooked creamy black urad lentils simmered overnight with fresh churned white butter, tomatoes and royal Awadhi spices.',
      variants: [
        { name: 'Half Handi (Serves 1)', price: 160 },
        { name: 'Full Handi (Serves 2-3)', price: 240 },
        { name: 'Family Handi (Serves 4-5)', price: 440 },
      ],
      addons: [
        { name: 'Extra Amul Butter Cube', price: 25 },
        { name: 'Roasted Garlic Dip', price: 20 },
      ],
      addonGroupIds: [spiceGroup?._id, toppingGroup?._id, breadGroup?._id].filter(Boolean),
    },
    {
      name: 'Yellow Dal Double Tadka',
      code: 'DG-YDT02',
      category: 'Dal & Curries',
      categoryId: seededCategories['Dal & Curries']?._id,
      menuId: primaryMenu._id,
      itemType: 'VEG' as const,
      price: 190,
      discountPrice: 180,
      preparationTime: 12,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600',
      description: 'Golden toor lentils tempered twice with garlic, cumin, asafetida (heeng), and whole dry red chilies in desi cow ghee.',
      variants: [
        { name: 'Regular Handi', price: 190 },
        { name: 'Large Handi', price: 280 },
      ],
      addons: [
        { name: 'Extra Desi Ghee Chaunk', price: 30 },
        { name: 'Crisp Green Chillies', price: 10 },
      ],
      addonGroupIds: [spiceGroup?._id, toppingGroup?._id].filter(Boolean),
    },
    {
      name: 'Paneer Butter Masala Shahi',
      code: 'DG-PBM03',
      category: 'Dal & Curries',
      categoryId: seededCategories['Dal & Curries']?._id,
      menuId: primaryMenu._id,
      itemType: 'VEG' as const,
      price: 280,
      discountPrice: 260,
      preparationTime: 16,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600',
      description: 'Fresh farm malai paneer cubes simmered in a velvety smooth gravy of vine-ripened tomatoes, cashews, and aromatic spices.',
      variants: [
        { name: 'Regular Portion', price: 280 },
        { name: 'Jumbo Portion', price: 390 },
      ],
      addons: [
        { name: 'Extra Cashew Cream Dip', price: 30 },
        { name: 'Extra Paneer Cubes (4 pcs)', price: 50 },
      ],
      addonGroupIds: [spiceGroup?._id, breadGroup?._id].filter(Boolean),
    },
    {
      name: 'Dal Khichdi Maharaja Platter',
      code: 'DG-DKP04',
      category: 'Rice & Biryani',
      categoryId: seededCategories['Rice & Biryani']?._id,
      menuId: primaryMenu._id,
      itemType: 'VEG' as const,
      price: 220,
      discountPrice: 200,
      preparationTime: 14,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600',
      description: 'Soul-comforting blend of yellow lentils and fragrant rice tempered with cumin and ghee, served with papad, pickle and boondi raita.',
      variants: [
        { name: 'Standard Thali', price: 220 },
        { name: 'Executive Thali with Sweet', price: 280 },
      ],
      addons: [
        { name: 'Pure Desi Ghee Cup', price: 25 },
        { name: 'Masala Boondi Raita Bowl', price: 40 },
        { name: 'Mango Pickle & Chutney', price: 15 },
      ],
      addonGroupIds: [spiceGroup?._id].filter(Boolean),
    },
    {
      name: 'Dum Handi Veg Hyderabadi Biryani',
      code: 'DG-HB05',
      category: 'Rice & Biryani',
      categoryId: seededCategories['Rice & Biryani']?._id,
      menuId: primaryMenu._id,
      itemType: 'VEG' as const,
      price: 260,
      discountPrice: 250,
      preparationTime: 20,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
      description: 'Aged basmati rice slow-cooked on dum with fresh seasonal vegetables, saffron, mint and authentic Hyderabadi spices in a sealed earthen pot.',
      variants: [
        { name: 'Single Pot (1 Person)', price: 260 },
        { name: 'Handi (2-3 Persons)', price: 460 },
      ],
      addons: [
        { name: 'Extra Burani Garlic Raita', price: 40 },
        { name: 'Mirchi Ka Salan', price: 35 },
      ],
      addonGroupIds: [spiceGroup?._id].filter(Boolean),
    },
    {
      name: 'Paneer Tikka Angara Sizzler',
      code: 'DG-PTA06',
      category: 'Starters & Tandoor',
      categoryId: seededCategories['Starters & Tandoor']?._id,
      menuId: dinnerMenu._id,
      itemType: 'VEG' as const,
      price: 270,
      discountPrice: 250,
      preparationTime: 18,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600',
      description: 'Succulent malai paneer cubes marinated in hung curd, smoked mustard oil and degi mirch, char-grilled to perfection in clay tandoor.',
      variants: [
        { name: 'Half Platter (6 Pcs)', price: 270 },
        { name: 'Full Platter (10 Pcs)', price: 420 },
      ],
      addons: [
        { name: 'Spicy Mint Chutney & Lacha Onion', price: 20 },
        { name: 'Extra Chaat Masala & Lemon', price: 10 },
      ],
      addonGroupIds: [spiceGroup?._id].filter(Boolean),
    },
    {
      name: 'Garlic Cheese Naan',
      code: 'DG-GCN07',
      category: 'Tandoor & Breads',
      categoryId: seededCategories['Tandoor & Breads']?._id,
      menuId: primaryMenu._id,
      itemType: 'VEG' as const,
      price: 85,
      discountPrice: 75,
      preparationTime: 8,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600',
      description: 'Refined flour bread stuffed with gooey mozzarella and processed cheese, roasted in tandoor and brushed with garlic butter.',
      addons: [
        { name: 'Extra Melted Cheese Layer', price: 30 },
        { name: 'Chilli Flakes & Oregano', price: 10 },
      ],
    },
    {
      name: 'Butter Tandoori Roti',
      code: 'DG-BTR08',
      category: 'Tandoor & Breads',
      categoryId: seededCategories['Tandoor & Breads']?._id,
      menuId: primaryMenu._id,
      itemType: 'VEG' as const,
      price: 30,
      preparationTime: 5,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      description: 'Crisp whole wheat flatbread made fresh in traditional clay oven brushed with butter.',
      addons: [
        { name: 'Extra Amul Butter Brush', price: 10 },
      ],
    },
    {
      name: 'Alphonso Mango Malai Lassi',
      code: 'DG-AML09',
      category: 'Beverages & Drinks',
      categoryId: seededCategories['Beverages & Drinks']?._id,
      menuId: bevMenu._id,
      itemType: 'VEG' as const,
      price: 110,
      discountPrice: 95,
      preparationTime: 6,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1571006687898-1e42a048a176?w=600',
      description: 'Thick, creamy churned sweet yogurt blended with Ratnagiri Alphonso mango pulp, topped with saffron cream and pistachio flakes.',
      variants: [
        { name: 'Glass (300ml)', price: 110 },
        { name: 'Large Kulhad (500ml)', price: 160 },
      ],
      addons: [
        { name: 'Pistachio & Saffron Malai Dollop', price: 25 },
        { name: 'Almond Flakes Crunch', price: 20 },
      ],
      addonGroupIds: [drinkGroup?._id].filter(Boolean),
    },
    {
      name: 'Masala Chaas (Spiced Buttermilk)',
      code: 'DG-MC10',
      category: 'Beverages & Drinks',
      categoryId: seededCategories['Beverages & Drinks']?._id,
      menuId: bevMenu._id,
      itemType: 'VEG' as const,
      price: 50,
      preparationTime: 4,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      description: 'Refreshing churned curd infused with roasted cumin powder, black salt, fresh ginger, mint, and green chilies.',
      addons: [
        { name: 'Boondi Topping', price: 15 },
      ],
    },
    {
      name: 'Shahi Gulab Jamun with Rabdi',
      code: 'DG-GJR11',
      category: 'Desserts & Sweets',
      categoryId: seededCategories['Desserts & Sweets']?._id,
      menuId: bevMenu._id,
      itemType: 'VEG' as const,
      price: 120,
      discountPrice: 110,
      preparationTime: 8,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600',
      description: 'Warm, melt-in-the-mouth golden fried khoya dumplings steeped in rose cardamom sugar syrup, served with thick chilled malai rabdi.',
      variants: [
        { name: '2 Pieces with Rabdi', price: 120 },
        { name: '4 Pieces Family Pack', price: 210 },
      ],
      addons: [
        { name: 'Extra Warm Rabdi Bowl', price: 40 },
        { name: 'Chandi Ka Vark & Silver Pistachio', price: 20 },
      ],
    },
    {
      name: 'Moong Dal Halwa Desi Ghee',
      code: 'DG-MDH12',
      category: 'Desserts & Sweets',
      categoryId: seededCategories['Desserts & Sweets']?._id,
      menuId: bevMenu._id,
      itemType: 'VEG' as const,
      price: 130,
      preparationTime: 10,
      taxRate: 5,
      isAvailable: true,
      status: 'active',
      description: 'Traditional slow-roasted yellow moong lentil pudding cooked in pure desi ghee, garnished with cashews and golden raisins.',
      variants: [
        { name: 'Single Cup (150g)', price: 130 },
        { name: 'Sharing Bowl (300g)', price: 240 },
      ],
      addons: [
        { name: 'Crushed Roasted Almonds', price: 25 },
      ],
    },
  ];

  for (const itemDef of menuItemsData) {
    const existing = await MenuItem.findOne({ name: itemDef.name });
    if (!existing) {
      await MenuItem.create({
        ...itemDef,
        restaurantId: restaurant._id,
        branchId: branch._id,
        currency: 'INR',
        displayOrder: 0,
        createdBy: userId,
        updatedBy: userId,
      });
    } else {
      await MenuItem.updateOne(
        { _id: existing._id },
        {
          $set: {
            price: itemDef.price,
            discountPrice: itemDef.discountPrice,
            variants: itemDef.variants || [],
            addons: itemDef.addons || [],
            addonGroupIds: itemDef.addonGroupIds || [],
            isAvailable: true,
            status: 'active',
            category: itemDef.category,
            categoryId: itemDef.categoryId,
            imageUrl: itemDef.imageUrl,
            description: itemDef.description,
          },
        }
      );
    }
  }

  // Also update AddonGroup.menuItemIds to cross-link items
  console.log('Cross-linking Addon Groups with Menu Items...');
  const allCreatedItems = await MenuItem.find({ restaurantId: restaurant._id });
  for (const group of Object.values(seededAddonGroups)) {
    const linkedItemIds = allCreatedItems
      .filter((i) => (i.addonGroupIds || []).some((gId) => String(gId) === String(group._id)))
      .map((i) => i._id);

    await AddonGroup.updateOne({ _id: group._id }, { $set: { menuItemIds: linkedItemIds } });
  }

  console.log('✅ Menu, Categories, Addons & Catalog seeding completed successfully!');
};
