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
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      fullName: 'Quản trị viên',
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
    for (let j = 0; j < numClasses; j++) {
      const cname = classNames[classIdx] ?? `Lớp${classIdx}`;
      const cls = await prisma.class.upsert({
        where: { id: `class-${cname.toLowerCase()}` },
        update: { name: cname, campusId: campuses[ci].id, schoolYear: '2025-2026' },
        create: { id: `class-${cname.toLowerCase()}`, name: cname, campusId: campuses[ci].id, schoolYear: '2025-2026', teacherName: `GV. Nguyễn Văn ${String.fromCharCode(65 + classIdx)}` },
      });
      classes.push(cls);
      classIdx++;
    }
  }

  // Students: 4 per class
  const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Võ', 'Phan', 'Đỗ', 'Huỳnh', 'Bùi'];
  const firstNames = ['An', 'Bình', 'Chi', 'Dũng', 'Em', 'Phúc', 'Giang', 'Hưng', 'Khoa', 'Linh',
    'Minh', 'Nam', 'Oanh', 'Phước', 'Quân', 'Sang', 'Tâm', 'Uýt', 'Vân', 'Xuân',
    'Yến', 'Bảo', 'Cường', 'Dương', 'Hải', 'Kiên', 'Lâm', 'Ngọc', 'Trúc', 'Tùng',
    'Việt', 'Huy', 'Thành', 'Trung', 'Tiến', 'Luân', 'Đạt', 'Thắng', 'Tuấn', 'Long'];
  let studentCount = 0;

  for (const cls of classes) {
    for (let si = 0; si < 4; si++) {
      studentCount++;
      const code = `HS${String(studentCount).padStart(4, '0')}`;
      const fullName = `${lastNames[studentCount % lastNames.length]} Văn ${firstNames[studentCount % firstNames.length]}`;
      const hash = await bcrypt.hash(code, 10); // password = student code

      await prisma.student.upsert({
        where: { studentCode: code },
        update: { fullName, classId: cls.id },
        create: {
          studentCode: code,
          fullName,
          classId: cls.id,
          phone: `09${String(10000000 + studentCount)}`,
          parentPhone: `09${String(20000000 + studentCount)}`,
          passwordHash: hash,
        },
      });
    }
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
      update: { value: s.value },
      create: s,
    });
  }

  console.log(`Seeded: ${campuses.length} campuses, ${classes.length} classes, ${studentCount} students, ${feeTypes.length} fee types`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
