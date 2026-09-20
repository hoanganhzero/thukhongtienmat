import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD ?? 'admin123', 10);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {
      fullName: 'Quản trị viên tối cao',
      role: 'super_admin',
      campusId: null,
      classId: null,
    },
    create: {
      username: 'admin',
      passwordHash: adminHash,
      fullName: 'Quản trị viên tối cao',
      role: 'super_admin',
      campusId: null,
    },
  });

  // Fee types
  const feeTypes = [
    { id: 'bhtt', name: 'BHTT', description: 'Bảo hiểm tai nạn', amount: 100000, bankAccountNumber: '108869921106', bankAccountName: 'TRAN QUOC HOANG ANH', bankName: 'VietinBank' },
    { id: 'bhyt', name: 'BHYT', description: 'Bảo hiểm y tế', amount: 563220, bankAccountNumber: '3100211072899', bankAccountName: 'TT GDNN GDTX KV TAN NINH' },
    { id: 'slldtt', name: 'Sổ liên lạc điện tử', description: 'Phí sử dụng sổ liên lạc điện tử', amount: 110000, bankAccountNumber: '3100211072899', bankAccountName: 'TT GDNN GDTX KV TAN NINH' },
  ];

  for (const ft of feeTypes) {
    await prisma.feeType.upsert({
      where: { id: ft.id },
      update: { name: ft.name, description: ft.description, amount: ft.amount, bankAccountNumber: ft.bankAccountNumber, bankAccountName: ft.bankAccountName, bankName: ft.bankName ?? 'Agribank' },
      create: { ...ft, bankName: ft.bankName ?? 'Agribank' },
    });
  }

  // App settings
  const defaultSettings = [
    { key: 'school_name', value: 'Trung tâm GDNN-GDTX Khu vực Tân Ninh' },
    { key: 'school_address', value: 'Tây Ninh' },
    { key: 'current_academic_year', value: '2025-2026' },
  ];

  for (const s of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log(`Initialized admin, settings and ${feeTypes.length} fee types without demo data.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
