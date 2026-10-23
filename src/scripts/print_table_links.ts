import { connectDatabase } from '../config/database.js';
import { DiningTable } from '../models/DiningTable.js';
import { QrMenuService } from '../modules/dining/qrMenu.service.js';

async function main() {
  await connectDatabase();
  const tables = await DiningTable.find().limit(5);
  console.log('\n=============================================');
  console.log('📌 ACTIVE TABLES & DIRECT DIGITAL MENU LINKS:');
  console.log('=============================================');
  for (const t of tables) {
    const qr = await QrMenuService.getOrCreateTableQr(t._id.toString());
    console.log(`Table ${t.table_number}: ${qr.public_url}`);
  }
  console.log('=============================================\n');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
