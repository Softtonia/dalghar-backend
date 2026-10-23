import { DiningArea } from '../../models/DiningArea.js';
import { DiningTable } from '../../models/DiningTable.js';
import { DiningTableStatusHistory } from '../../models/DiningTableStatusHistory.js';
import { Branch } from '../../models/Branch.js';
import { Restaurant } from '../../models/Restaurant.js';
import { User } from '../../models/User.js';

export const seedDiningAreasAndTables = async (): Promise<void> => {
  console.log('Seeding Dining Areas and Physical Tables...');

  const branch = await Branch.findOne();
  if (!branch) {
    console.warn('⚠️ No branch found to seed dining areas.');
    return;
  }

  const restaurant = await Restaurant.findOne();
  const restaurantId = restaurant ? restaurant._id : branch.restaurantId;

  const admin = await User.findOne({ email: 'sales@softtonia.com' });
  const adminId = admin ? admin._id : null;

  // 1. Seed Dining Areas
  const areaDefs = [
    {
      name: 'Ground Floor Dining Hall',
      code: 'GF-MAIN',
      area_type: 'floor' as const,
      description: 'Main bustling dining area on the ground floor with quick kitchen access.',
      display_order: 1,
      status: 'active' as const,
      layout_config: { gridWidth: 800, gridHeight: 600, gridSize: 40 },
    },
    {
      name: 'First Floor AC Family Section',
      code: 'FF-AC',
      area_type: 'section' as const,
      description: 'Quiet, air-conditioned family zone on the first floor.',
      display_order: 2,
      status: 'active' as const,
      layout_config: { gridWidth: 800, gridHeight: 600, gridSize: 40 },
    },
    {
      name: 'Garden Open Patio',
      code: 'PATIO',
      area_type: 'patio' as const,
      description: 'Open-air lush garden dining with evening canopy lighting.',
      display_order: 3,
      status: 'active' as const,
      layout_config: { gridWidth: 800, gridHeight: 500, gridSize: 40 },
    },
    {
      name: 'Maharaja VIP Private Dining',
      code: 'VIP-LOUNGE',
      area_type: 'private_room' as const,
      description: 'Exclusive sound-insulated private dining room for parties and meetings.',
      display_order: 4,
      status: 'active' as const,
      layout_config: { gridWidth: 600, gridHeight: 400, gridSize: 40 },
    },
  ];

  const seededAreas: Record<string, any> = {};

  for (const aDef of areaDefs) {
    let area = await DiningArea.findOne({ branch_id: branch._id, code: aDef.code });
    if (!area) {
      area = await DiningArea.create({
        ...aDef,
        restaurant_id: restaurantId,
        branch_id: branch._id,
        created_by: adminId,
        updated_by: adminId,
      });
      console.log(`  + Created Dining Area: ${area.name} [${area.code}]`);
    }
    seededAreas[aDef.code] = area;
  }

  // 2. Seed Dining Tables
  const tableDefs = [
    // Ground Floor
    {
      table_number: 'T-1',
      display_name: 'Window 2-Seater',
      area_code: 'GF-MAIN',
      capacity: 2,
      minimum_capacity: 1,
      shape: 'square' as const,
      position_x: 60,
      position_y: 60,
      width: 80,
      height: 80,
      current_status: 'available' as const,
      notes: 'Near front window view',
    },
    {
      table_number: 'T-2',
      display_name: 'Main 4-Seater A',
      area_code: 'GF-MAIN',
      capacity: 4,
      minimum_capacity: 2,
      shape: 'square' as const,
      position_x: 200,
      position_y: 60,
      width: 100,
      height: 100,
      current_status: 'available' as const,
      notes: 'Standard 4-top',
    },
    {
      table_number: 'T-3',
      display_name: 'Main 4-Seater B',
      area_code: 'GF-MAIN',
      capacity: 4,
      minimum_capacity: 2,
      shape: 'square' as const,
      position_x: 350,
      position_y: 60,
      width: 100,
      height: 100,
      current_status: 'occupied' as const,
      notes: 'Occupied by dining guests',
    },
    {
      table_number: 'T-4',
      display_name: 'Center Long 6-Top',
      area_code: 'GF-MAIN',
      capacity: 6,
      minimum_capacity: 4,
      shape: 'rectangle' as const,
      position_x: 200,
      position_y: 220,
      width: 150,
      height: 90,
      current_status: 'reserved' as const,
      notes: 'Reserved for 8 PM dinner booking',
    },
    {
      table_number: 'T-5',
      display_name: 'Round Corner 4',
      area_code: 'GF-MAIN',
      capacity: 4,
      minimum_capacity: 2,
      shape: 'round' as const,
      position_x: 60,
      position_y: 220,
      width: 90,
      height: 90,
      current_status: 'cleaning' as const,
      notes: 'Being sanitized after last guest checkout',
    },

    // First Floor AC Section
    {
      table_number: 'T-6',
      display_name: 'Family Long 8-Top',
      area_code: 'FF-AC',
      capacity: 8,
      minimum_capacity: 5,
      shape: 'rectangle' as const,
      position_x: 80,
      position_y: 80,
      width: 180,
      height: 100,
      current_status: 'available' as const,
      notes: 'Ideal for large family dinner',
    },
    {
      table_number: 'T-7',
      display_name: 'AC Quiet 4-Top',
      area_code: 'FF-AC',
      capacity: 4,
      minimum_capacity: 2,
      shape: 'square' as const,
      position_x: 320,
      position_y: 80,
      width: 100,
      height: 100,
      current_status: 'available' as const,
      notes: 'Quiet 4-top table',
    },
    {
      table_number: 'T-8',
      display_name: 'Couples Round Table',
      area_code: 'FF-AC',
      capacity: 2,
      minimum_capacity: 1,
      shape: 'round' as const,
      position_x: 80,
      position_y: 240,
      width: 80,
      height: 80,
      current_status: 'available' as const,
    },

    // Garden Patio
    {
      table_number: 'T-9',
      display_name: 'Garden Breeze Round',
      area_code: 'PATIO',
      capacity: 4,
      minimum_capacity: 2,
      shape: 'round' as const,
      position_x: 90,
      position_y: 90,
      width: 95,
      height: 95,
      current_status: 'available' as const,
      notes: 'Open garden view',
    },
    {
      table_number: 'T-10',
      display_name: 'Patio Lantern 4-Top',
      area_code: 'PATIO',
      capacity: 4,
      minimum_capacity: 2,
      shape: 'round' as const,
      position_x: 250,
      position_y: 90,
      width: 95,
      height: 95,
      current_status: 'available' as const,
    },
    {
      table_number: 'T-11',
      display_name: 'Patio Bench 6-Top',
      area_code: 'PATIO',
      capacity: 6,
      minimum_capacity: 3,
      shape: 'rectangle' as const,
      position_x: 90,
      position_y: 240,
      width: 160,
      height: 85,
      current_status: 'out_of_service' as const,
      notes: 'Rain umbrella replacement in progress',
    },

    // Maharaja VIP Lounge
    {
      table_number: 'VIP-1',
      display_name: 'Royal Oval 10-Top',
      area_code: 'VIP-LOUNGE',
      capacity: 10,
      minimum_capacity: 6,
      shape: 'oval' as const,
      position_x: 100,
      position_y: 100,
      width: 220,
      height: 120,
      current_status: 'reserved' as const,
      notes: 'Pre-booked corporate VIP dinner',
    },
    {
      table_number: 'VIP-2',
      display_name: 'Executive Board 12-Top',
      area_code: 'VIP-LOUNGE',
      capacity: 12,
      minimum_capacity: 8,
      shape: 'oval' as const,
      position_x: 100,
      position_y: 260,
      width: 240,
      height: 120,
      current_status: 'available' as const,
      notes: 'Executive dining setting with AV screen',
    },
  ];

  for (const tDef of tableDefs) {
    const area = seededAreas[tDef.area_code];
    if (!area) continue;

    let table = await DiningTable.findOne({
      branch_id: branch._id,
      table_number: tDef.table_number,
    });

    if (!table) {
      table = await DiningTable.create({
        restaurant_id: restaurantId,
        branch_id: branch._id,
        dining_area_id: area._id,
        table_number: tDef.table_number,
        display_name: tDef.display_name,
        capacity: tDef.capacity,
        minimum_capacity: tDef.minimum_capacity,
        shape: tDef.shape,
        position_x: tDef.position_x,
        position_y: tDef.position_y,
        width: tDef.width,
        height: tDef.height,
        current_status: tDef.current_status,
        is_combinable: true,
        is_active: true,
        notes: tDef.notes,
        created_by: adminId,
        updated_by: adminId,
      });

      await DiningTableStatusHistory.create({
        restaurant_id: restaurantId,
        branch_id: branch._id,
        dining_table_id: table._id,
        previous_status: null,
        new_status: tDef.current_status,
        reason: 'Initial physical table seeding',
        changed_by: adminId,
        source: 'system',
      });

      console.log(`  + Created Table: ${table.table_number} (${table.capacity} seats, ${table.shape}) in ${tDef.area_code}`);
    }
  }

  console.log('✅ Dining areas and tables seeding complete.');
};
