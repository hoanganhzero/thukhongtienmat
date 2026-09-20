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

  // Import the supplied 2026-2027 class/GVCN roster idempotently.
  // Blank teacher rows intentionally create only the class, without an account.
  const roster = [
    '10A1|Phân hiệu Tân Ninh|2026-2027|Nguyễn Xuân Hải|xuanhai|Tayninh@2026',
    '10A2|Phân hiệu Tân Ninh|2026-2027|Nguyễn Thị Kim Ngọc|kimngoc|Tayninh@2026',
    '10Đ1|Trụ sở chính|2026-2027|Quan Dân Hạnh|danhanh|Tayninh@2026',
    '10Đ2|Trụ sở chính|2026-2027|Nguyễn Thị Huyền Trinh|huyentrinh|Tayninh@2026',
    '10Đ3|Trụ sở chính|2026-2027|||Tayninh@2026',
    '10B1|Điểm trường Hòa Thành|2026-2027|Đặng Thị Trúc Vy|trucvy|Tayninh@2026',
    '10B2|Điểm trường Hòa Thành|2026-2027|Nguyễn Lữ Anh Tú|anhtu|Tayninh@2026',
    '10C1|Điểm trường Châu Thành|2026-2027|Nguyễn Thị A|thia|Tayninh@2026',
    '10C2|Điểm trường Châu Thành|2026-2027|Võ Thị Hạnh|thihanh|Tayninh@2026',
    '11A1|Phân hiệu Tân Ninh|2026-2027|Nguyễn Lê Phương Nhi|phuongnhi|Tayninh@2026',
    '11A2|Phân hiệu Tân Ninh|2026-2027|Võ Thị Anh Thư|anhthu|Tayninh@2026',
    '11A3|Phân hiệu Tân Ninh|2026-2027|Nguyễn Thanh Long|thanhlong|Tayninh@2026',
    '11A4|Phân hiệu Tân Ninh|2026-2027|Tạ Thị Diễm Trang|diemtrang|Tayninh@2026',
    '11A5|Phân hiệu Tân Ninh|2026-2027|Vũ Thị Thoa|thithoa|Tayninh@2026',
    '11VLVH1|Phân hiệu Tân Ninh|2026-2027|Lê Thụy Vương Lan|vuonglan|Tayninh@2026',
    '11VLVH2|Phân hiệu Tân Ninh|2026-2027|Tạ Thị Diễm Trang|diemtrang|Tayninh@2026',
    '11VLVH3|Phân hiệu Tân Ninh|2026-2027|Lê Thụy Vương Lan|vuonglan|Tayninh@2026',
    '11VLVH4|Phân hiệu Tân Ninh|2026-2027|Vũ Thị Thoa|thithoa|Tayninh@2026',
    '11B1|Điểm trường Hòa Thành|2026-2027|Lê Thị Kim Hồng|kimhong|Tayninh@2026',
    '11B2|Điểm trường Hòa Thành|2026-2027|Nguyễn Quốc Sinh|quocsinh|Tayninh@2026',
    '11Đ1|Điểm trường Hòa Thành|2026-2027|Nguyễn Văn Hưởng|vanhuong|Tayninh@2026',
    '11Đ2|Điểm trường Hòa Thành|2026-2027|Đặng Thị Hồng Hương|honghuong|Tayninh@2026',
    '11C1|Điểm trường Châu Thành|2026-2027|Nguyễn Thị Như Quỳnh|nhuquynh|Tayninh@2026',
    '11C2|Điểm trường Châu Thành|2026-2027|Bùi Viết Nam Trung|namtrung|Tayninh@2026',
    '12A1|Phân hiệu Tân Ninh|2026-2027|Lê Thị Thanh Hoa|thanhhoa|Tayninh@2026',
    '12A2|Phân hiệu Tân Ninh|2026-2027|Trần Nguyễn Minh Ngọc|minhngoc|Tayninh@2026',
    '12A3|Phân hiệu Tân Ninh|2026-2027|Nguyễn Thị Giang|thigiang|Tayninh@2026',
    '12A4|Phân hiệu Tân Ninh|2026-2027|Vũ Thị Thơm|thithom|Tayninh@2026',
    '12A5|Phân hiệu Tân Ninh|2026-2027|Phạm Thị Kim Quyên|kimquyen|Tayninh@2026',
    '12VLVH1|Phân hiệu Tân Ninh|2026-2027|Trần Ngọc Trinh|ngoctrinh|Tayninh@2026',
    '12VLVH2|Phân hiệu Tân Ninh|2026-2027|Võ Thị Nhàn|thinhan|Tayninh@2026',
    '12VLVH3|Phân hiệu Tân Ninh|2026-2027|Hà Thị Thương Huyền|thuonghuyen|Tayninh@2026',
    '12VLVH4|Phân hiệu Tân Ninh|2026-2027|Nguyễn Thị Gái|thigai|Tayninh@2026',
    '12VLVH5|Phân hiệu Tân Ninh|2026-2027|Đinh Tấn Trung|tantrung|Tayninh@2026',
    '12B1|Điểm trường Hòa Thành|2026-2027|Lê Thị Kiều Linh|kieulinh|Tayninh@2026',
    '12B2|Điểm trường Hòa Thành|2026-2027|Lê Thị Diễm Hương|diemhuong|Tayninh@2026',
    '12B3|Điểm trường Hòa Thành|2026-2027|Đặng Thị Hồng Thắm|hongtham|Tayninh@2026',
    '12Đ1|Điểm trường Hòa Thành|2026-2027|Lê Văn Minh|vanminh|Tayninh@2026',
    '12Đ2|Điểm trường Hòa Thành|2026-2027|Vũ Thị Tố Như|tonhu|Tayninh@2026',
    '12Đ3|Điểm trường Hòa Thành|2026-2027|Huỳnh Anh Quốc|anhquoc|Tayninh@2026',
    '12Đ4|Điểm trường Hòa Thành|2026-2027|Lê Tuyết Mai|tuyetmai|Tayninh@2026',
    '12C1|Điểm trường Châu Thành|2026-2027|Nguyễn Hoài Lộc|hoailoc|Tayninh@2026',
    '12C2|Điểm trường Châu Thành|2026-2027|Hoàng Thị Uyên|thiuyen|Tayninh@2026',
    '12C3|Điểm trường Châu Thành|2026-2027|Phạm Văn Chiến|vanchien|Tayninh@2026',
    '12C4|Điểm trường Châu Thành|2026-2027|Trần Quốc Hoàng Anh|hoanganh|Tayninh@2026',
    '12C5|Điểm trường Châu Thành|2026-2027|Nguyễn Thị Liên Khương|lienkhuong|Tayninh@2026',
    '12C6|Điểm trường Châu Thành|2026-2027|Nguyễn Thị Thắm|thitham|Tayninh@2026',
  ];
  const teacherPasswords = new Map<string, string>();
  for (const line of roster) {
    const [name, campusName, schoolYear, teacherName, username, password] = line.split('|');
    const campus = await prisma.campus.findFirst({ where: { name: campusName }, select: { id: true } });
    if (!campus) continue;
    const existingClass = await prisma.class.findFirst({ where: { name, campusId: campus.id, schoolYear }, select: { id: true } });
    const cls = existingClass
      ? await prisma.class.update({ where: { id: existingClass.id }, data: { teacherName: teacherName || null } })
      : await prisma.class.create({ data: { name, campusId: campus.id, schoolYear, teacherName: teacherName || null } });
    if (username && teacherName && password) {
      teacherPasswords.set(username, password);
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.admin.upsert({
        where: { username },
        update: { fullName: teacherName, role: 'teacher', campusId: campus.id, classId: cls.id, passwordHash },
        create: { username, passwordHash, fullName: teacherName, role: 'teacher', campusId: campus.id, classId: cls.id },
      });
    }
  }

  console.log(`Initialized admin, settings, ${feeTypes.length} fee types, ${roster.length} classes and ${teacherPasswords.size} GVCN accounts.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
