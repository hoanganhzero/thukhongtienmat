import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Hidden test account
  await prisma.user.upsert({
    where: { email: 'abacus-72149f88@example.com' },
    update: {},
    create: {
      email: 'abacus-72149f88@example.com',
      password: await bcrypt.hash('w#Tjmkk5dl', 10),
      name: 'Test Admin',
    },
  });

  // Admin account: admin/admin123
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminHash,
      fullName: 'Quản trị viên tối cao',
      role: 'super_admin',
      campusId: null,
    },
    create: {
      username: 'admin',
      passwordHash: adminHash,
      fullName: 'Quản trị viên tối cao',
      role: 'super_admin',
      campusId: null,
    },
  });

  // Thủ quỹ / Kế toán account: ketoan/ketoan123
  const accountantHash = await bcrypt.hash('ketoan123', 10);
  await prisma.admin.upsert({
    where: { username: 'ketoan' },
    update: {},
    create: {
      username: 'ketoan',
      passwordHash: accountantHash,
      fullName: 'Thủ quỹ / Kế toán',
      role: 'accountant',
      campusId: null,
    },
  });

  // 4 campuses
  const campusData = [
    { name: 'Trụ sở chính', address: 'Thị trấn Tân Ninh, Tây Ninh', phone: '0276.3000001' },
    { name: 'Phân hiệu Tân Ninh', address: 'Tân Ninh, Tây Ninh', phone: '0276.3000002' },
    { name: 'Điểm trường Hòa Thành', address: 'Hòa Thành, Tây Ninh', phone: '0276.3000003' },
    { name: 'Điểm trường Châu Thành', address: 'Châu Thành, Tây Ninh', phone: '0276.3000004' },
  ];

  const campuses: any[] = [];
  for (const c of campusData) {
    const campus = await prisma.campus.upsert({
      where: { id: c.name.replace(/\s+/g, '-').toLowerCase() },
      update: { ...c },
      create: { id: c.name.replace(/\s+/g, '-').toLowerCase(), ...c },
    });
    campuses.push(campus);
  }

  // Fee types
  const feeTypes = [
    { id: 'bhtt', name: 'BHTT', description: 'Bảo hiểm tai nạn', amount: 100000, bankAccountNumber: '3100211072899', bankAccountName: 'TT GDNN GDTX KV TAN NINH' },
    { id: 'bhyt', name: 'BHYT', description: 'Bảo hiểm y tế', amount: 563220, bankAccountNumber: '3100211072899', bankAccountName: 'TT GDNN GDTX KV TAN NINH' },
    { id: 'slldtt', name: 'Sổ liên lạc điện tử', description: 'Phí sử dụng sổ liên lạc điện tử', amount: 110000, bankAccountNumber: '3100211072899', bankAccountName: 'TT GDNN GDTX KV TAN NINH' },
  ];

  for (const ft of feeTypes) {
    await prisma.feeType.upsert({
      where: { id: ft.id },
      update: { name: ft.name, description: ft.description, amount: ft.amount, bankAccountNumber: ft.bankAccountNumber, bankAccountName: ft.bankAccountName },
      create: { ...ft, bankName: 'Agribank' },
    });
  }

  // Classes: 2-3 per campus
  const classNames = ['10A1', '10A2', '11A1', '11A2', '12A1', '12A2', '10B1', '11B1', '12B1', '10C1'];
  const classesPerCampus = [3, 3, 2, 2]; // total 10 classes
  let classIdx = 0;
  const classes: any[] = [];
  for (let ci = 0; ci < campuses.length; ci++) {
    const numClasses = classesPerCampus[ci] ?? 2;
