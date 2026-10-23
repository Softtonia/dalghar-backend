import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectDatabase } from '../config/database.js';

async function seedAllBranches() {
  await connectDatabase();
  const db = mongoose.connection.db;
  if (!db) {
    console.error('No database connected');
    return;
  }

  const branches = await db.collection('branches').find({}).toArray();
  const sourceBranchId = new mongoose.Types.ObjectId('6acf78450bc62bd02c52196b');
  const sourceTables = await db.collection('dining_tables').find({ branch_id: sourceBranchId }).toArray();
  const sourceAreas = await db.collection('dining_areas').find({ branch_id: sourceBranchId }).toArray();

  for (const b of branches) {
    if (String(b._id) === '6acf78450bc62bd02c52196b') continue;
    
    const existingCount = await db.collection('dining_tables').countDocuments({
      $or: [{ branch_id: b._id }, { branch_id: String(b._id) }],
    });

    if (existingCount === 0) {
      console.log(`Seeding tables for branch: "${b.name}" (${b._id})`);
      const areaMap: Record<string, string> = {};

      for (const a of sourceAreas) {
        const newAreaId = crypto.randomUUID();
        const areaDoc = {
          ...a,
          _id: new mongoose.Types.ObjectId(),
          id: newAreaId,
          branch_id: b._id,
          restaurant_id: b.restaurantId || a.restaurant_id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.collection('dining_areas').insertOne(areaDoc);
        areaMap[a.id || String(a._id)] = newAreaId;
      }

      for (const t of sourceTables) {
        const newTable = {
          ...t,
          _id: new mongoose.Types.ObjectId(),
          id: crypto.randomUUID(),
          branch_id: b._id,
          restaurant_id: b.restaurantId || t.restaurant_id,
          dining_area_id: areaMap[t.dining_area_id] || t.dining_area_id,
          current_status: 'available',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.collection('dining_tables').insertOne(newTable);
      }
    }
  }

  const total = await db.collection('dining_tables').countDocuments();
  console.log(`✅ Seeding complete. Total tables in database: ${total}`);
  await mongoose.disconnect();
}

seedAllBranches().catch(console.error);
