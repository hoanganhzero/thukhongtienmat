type SchoolClass = { id: string; name: string; campusId?: string; schoolYear?: string; campus?: { id?: string; name?: string } };

const text = (value: unknown) => String(value ?? '').trim();

export function parseStudentRows(rows: Record<string, unknown>[], classes: SchoolClass[]) {
  const classMap = new Map<string, string>();
  classes.forEach((item) => {
    classMap.set(item.id.toLowerCase(), item.id);
    const name = item.name.trim().toLowerCase();
    const campus = String(item.campus?.name ?? item.campusId ?? '').trim().toLowerCase();
    const year = String(item.schoolYear ?? '').trim().toLowerCase();
    if (name && campus && year) classMap.set(`${name}|${campus}|${year}`, item.id);
    if (name && campus) classMap.set(`${name}|${campus}`, item.id);
    if (name && !classMap.has(name)) classMap.set(name, item.id);
  });
  const students: Array<Record<string, string>> = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const studentCode = text(row['Mã HS'] ?? row['Mã học sinh'] ?? row.studentCode);
    const fullName = text(row['Họ tên'] ?? row['Họ và tên'] ?? row.fullName);
    const classValue = text(row['Lớp'] ?? row['Mã lớp'] ?? row.className ?? row.classId);
    const campusValue = text(row['Cơ sở'] ?? row['Điểm trường'] ?? row.campusName ?? row.campusId).toLowerCase();
    const schoolYear = text(row['Năm học'] ?? row.schoolYear).toLowerCase();
    const classId = (campusValue && schoolYear ? classMap.get(`${classValue.toLowerCase()}|${campusValue}|${schoolYear}`) : undefined)
      ?? (campusValue ? classMap.get(`${classValue.toLowerCase()}|${campusValue}`) : undefined)
      ?? classMap.get(classValue.toLowerCase());

    if (!studentCode || !fullName || !classId) {
      errors.push(`Dòng ${index + 2}: thiếu mã học sinh, họ tên hoặc lớp/cơ sở/năm học không tồn tại.`);
      return;
    }

    students.push({
      studentCode,
      cccd: text(row['CCCD'] ?? row['Số CCCD'] ?? row.cccd),
      fullName,
      classId,
      phone: text(row['SĐT'] ?? row.phone),
      parentPhone: text(row['SĐT phụ huynh'] ?? row.parentPhone),
      zaloPhone: text(row.Zalo ?? row.zaloPhone),
      dateOfBirth: text(row['Ngày sinh'] ?? row.dateOfBirth),
    });
  });

  return { students, errors };
}
