import mongoose from 'mongoose';
import { connectDatabase } from '../../config/database.js';
import { Restaurant } from '../../models/Restaurant.js';
import { Branch } from '../../models/Branch.js';
import { PosPeripheral } from '../../models/PosPeripheral.js';
import { PosTerminal } from '../../models/PosTerminal.js';
import { PosPeripheralAssignment } from '../../models/PosPeripheralAssignment.js';
import { PosPeripheralEvent } from '../../models/PosPeripheralEvent.js';

export const seedPeripherals = async (): Promise<void> => {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    // Find restaurant and branch
    const restaurant = await Restaurant.findOne();
    if (!restaurant) {
      console.log('⚠️ No restaurant found to seed peripherals for.');
      return;
    }

    const branch = await Branch.findOne({ restaurantId: restaurant._id }) || await Branch.findOne();
    if (!branch) {
      console.log('⚠️ No branch found to seed peripherals for.');
      return;
    }

    const terminal = await PosTerminal.findOne({ branch_id: branch._id }) || await PosTerminal.findOne();

    console.log(`Seeding 3 POS peripheral devices for restaurant: ${restaurant.name}, branch: ${branch.name}...`);

    const sampleDevices = [
      {
        restaurant_id: restaurant._id,
        branch_id: branch._id,
        terminal_id: terminal?._id || null,
        device_name: 'Epson TM-T88VI Main Counter Receipt Printer',
        device_type: 'receipt_printer',
        connection_type: 'network',
        manufacturer: 'Epson',
        model_number: 'TM-T88VI-011',
        device_identifier: 'EPSON-PRN-88019',
        ip_address: '192.168.1.150',
        port_number: 9100,
        status: 'active',
        connectivity_status: 'online',
        last_seen_at: new Date(),
      },
      {
        restaurant_id: restaurant._id,
        branch_id: branch._id,
        terminal_id: terminal?._id || null,
        device_name: 'Star Micronics TSP143 Kitchen Order Printer (KOT)',
        device_type: 'kitchen_printer',
        connection_type: 'network',
        manufacturer: 'Star Micronics',
        model_number: 'TSP143III LAN',
        device_identifier: 'STAR-KOT-44210',
        ip_address: '192.168.1.155',
        port_number: 9100,
        status: 'active',
        connectivity_status: 'online',
        last_seen_at: new Date(),
      },
      {
        restaurant_id: restaurant._id,
        branch_id: branch._id,
        terminal_id: terminal?._id || null,
        device_name: 'APG Vasario Heavy Duty Cash Drawer',
        device_type: 'cash_drawer',
        connection_type: 'usb',
        manufacturer: 'APG Cash Drawer',
        model_number: 'VB320-BL1616',
        device_identifier: 'APG-DRAWER-9901',
        status: 'active',
        connectivity_status: 'online',
        last_seen_at: new Date(),
      },
      {
        restaurant_id: restaurant._id,
        branch_id: branch._id,
        terminal_id: terminal?._id || null,
        device_name: 'Honeywell Voyager 1400g 2D Barcode Scanner',
        device_type: 'scanner',
        connection_type: 'usb',
        manufacturer: 'Honeywell',
        model_number: '1400g-2D',
        device_identifier: 'HW-SCN-77341',
        status: 'active',
        connectivity_status: 'online',
        last_seen_at: new Date(),
      },
    ];

    for (const dev of sampleDevices) {
      const peripheral = await PosPeripheral.findOneAndUpdate(
        {
          branch_id: branch._id,
          device_identifier: dev.device_identifier,
        },
        dev,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Create initial diagnostic event
      await PosPeripheralEvent.create({
        peripheral_id: peripheral._id,
        terminal_id: terminal?._id || null,
        event_type: 'connected',
        severity: 'info',
        message: `Device "${dev.device_name}" registered and connected successfully`,
        event_metadata: {
          ip: dev.ip_address,
          port: dev.port_number,
        },
        occurred_at: new Date(),
      });

      // If terminal exists, assign default role
      if (terminal) {
        await PosPeripheralAssignment.findOneAndUpdate(
          {
            terminal_id: terminal._id,
            peripheral_id: peripheral._id,
          },
          {
            terminal_id: terminal._id,
            peripheral_id: peripheral._id,
            assignment_role:
              dev.device_type === 'kitchen_printer'
                ? 'kitchen'
                : dev.device_type === 'cash_drawer'
                ? 'cash_drawer'
                : 'default_receipt',
            is_primary: true,
            is_active: true,
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }

    console.log('✅ Successfully seeded POS peripheral hardware devices!');
  } catch (error) {
    console.error('❌ Failed to seed peripherals:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from database.');
    }
  }
};

seedPeripherals();
