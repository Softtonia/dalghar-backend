import { TableReservation } from '../../models/TableReservation.js';
import { ReservationTableAssignment } from '../../models/ReservationTableAssignment.js';
import { WaitingListEntry } from '../../models/WaitingListEntry.js';
import { DiningTable } from '../../models/DiningTable.js';
import { DiningArea } from '../../models/DiningArea.js';
import { Branch } from '../../models/Branch.js';
import { Restaurant } from '../../models/Restaurant.js';
import { User } from '../../models/User.js';

export const seedReservationsAndWaitingList = async (): Promise<void> => {
  console.log('Seeding Table Reservations and Waiting List...');

  const branch = await Branch.findOne();
  if (!branch) {
    console.warn('⚠️ No branch found for reservations seeder.');
    return;
  }

  const restaurant = await Restaurant.findOne();
  const restaurantId = restaurant ? restaurant._id : branch.restaurantId;

  const admin = await User.findOne({ email: 'sales@softtonia.com' });
  const adminId = admin ? admin._id : null;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // 1. Find tables for assignments
  const table4 = await DiningTable.findOne({ branch_id: branch._id, table_number: 'T-4' });
  const tableVip1 = await DiningTable.findOne({ branch_id: branch._id, table_number: 'VIP-1' });
  const patioArea = await DiningArea.findOne({ branch_id: branch._id, code: 'PATIO' });

  // 2. Seed Reservations
  const reservationDefs = [
    {
      reservation_number: `RES-${todayStr.replace(/-/g, '')}-001`,
      guest_name: 'Rajesh Sharma',
      guest_phone: '+91 98765 43210',
      guest_email: 'rajesh.sharma@example.com',
      guest_count: 6,
      reservation_date: todayStr,
      start_time: new Date(`${todayStr}T19:30:00.000Z`),
      end_time: new Date(`${todayStr}T21:30:00.000Z`),
      duration_minutes: 120,
      reservation_status: 'confirmed' as const,
      reservation_source: 'phone' as const,
      special_requests: 'Near center section, high chair needed for toddler',
      occasion: 'Family Dinner',
      estimated_amount: 3500,
      deposit_amount: 500,
      deposit_status: 'paid' as const,
      assigned_table_id: table4?.id || (table4 as any)?._id?.toString(),
    },
    {
      reservation_number: `RES-${todayStr.replace(/-/g, '')}-002`,
      guest_name: 'Dr. Vikram Malhotra',
      guest_phone: '+91 98112 34567',
      guest_email: 'vikram.malhotra@hospital.in',
      guest_count: 8,
      reservation_date: todayStr,
      start_time: new Date(`${todayStr}T20:00:00.000Z`),
      end_time: new Date(`${todayStr}T22:30:00.000Z`),
      duration_minutes: 150,
      reservation_status: 'confirmed' as const,
      reservation_source: 'website' as const,
      special_requests: 'VIP Maharaja private dining room, extra privacy',
      occasion: 'Anniversary Celebration',
      estimated_amount: 8000,
      deposit_amount: 2000,
      deposit_status: 'paid' as const,
      assigned_table_id: tableVip1?.id || (tableVip1 as any)?._id?.toString(),
    },
    {
      reservation_number: `RES-${tomorrowStr.replace(/-/g, '')}-003`,
      guest_name: 'Ananya Deshmukh',
      guest_phone: '+91 97234 56789',
      guest_email: 'ananya.d@fintech.co',
      guest_count: 4,
      reservation_date: tomorrowStr,
      start_time: new Date(`${tomorrowStr}T13:00:00.000Z`),
      end_time: new Date(`${tomorrowStr}T14:30:00.000Z`),
      duration_minutes: 90,
      reservation_status: 'pending' as const,
      reservation_source: 'mobile_app' as const,
      special_requests: 'Window seating preferred with garden view',
      occasion: 'Business Lunch',
      estimated_amount: 2200,
      deposit_amount: 0,
      deposit_status: 'not_required' as const,
    },
  ];

  for (const rDef of reservationDefs) {
    let resDoc = await TableReservation.findOne({
      branch_id: branch._id,
      reservation_number: rDef.reservation_number,
    });

    if (!resDoc) {
      const { assigned_table_id, ...resData } = rDef;
      resDoc = await TableReservation.create({
        ...resData,
        restaurant_id: restaurantId,
        branch_id: branch._id,
        created_by: adminId,
        updated_by: adminId,
      });
      console.log(`  + Created Reservation: #${resDoc.reservation_number} (${resDoc.guest_name})`);

      if (assigned_table_id) {
        await ReservationTableAssignment.create({
          restaurant_id: restaurantId,
          branch_id: branch._id,
          reservation_id: resDoc.id,
          dining_table_id: assigned_table_id,
          assignment_status: 'active',
          assigned_at: new Date(),
          assigned_by: adminId,
          notes: 'Initial seeded table assignment',
        });
        console.log(`    -> Assigned Table ID ${assigned_table_id}`);
      }
    }
  }

  // 3. Seed Waiting List Queue Entries
  const waitingDefs = [
    {
      queue_number: 'Q-01',
      guest_name: 'Amitabh Joshi',
      guest_phone: '+91 98450 11223',
      guest_count: 2,
      seating_preference: 'indoor' as const,
      estimated_wait_minutes: 10,
      status: 'notified' as const,
      notification_count: 1,
      notified_at: new Date(),
      notes: 'Buzzer #4 handed over. Prefers corner booth.',
    },
    {
      queue_number: 'Q-02',
      guest_name: 'Pooja Hegde',
      guest_phone: '+91 99887 66554',
      guest_count: 4,
      seating_preference: 'outdoor' as const,
      preferred_area_id: patioArea?.id || (patioArea as any)?._id?.toString(),
      estimated_wait_minutes: 20,
      status: 'waiting' as const,
      notes: 'Garden patio preferred for kids.',
    },
    {
      queue_number: 'Q-03',
      guest_name: 'Sameer Verma',
      guest_phone: '+91 97110 99887',
      guest_count: 5,
      seating_preference: 'any' as const,
      estimated_wait_minutes: 25,
      status: 'waiting' as const,
      notes: 'First available table for 5.',
    },
  ];

  for (const wDef of waitingDefs) {
    const existing = await WaitingListEntry.findOne({
      branch_id: branch._id,
      queue_number: wDef.queue_number,
    });

    if (!existing) {
      await WaitingListEntry.create({
        ...wDef,
        restaurant_id: restaurantId,
        branch_id: branch._id,
        created_by: adminId,
        updated_by: adminId,
      });
      console.log(`  + Created Waiting List: ${wDef.queue_number} (${wDef.guest_name}, party of ${wDef.guest_count})`);
    }
  }

  console.log('✅ Table Reservations & Waiting List seeded successfully.');
};
