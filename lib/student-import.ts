type SchoolClass = { id: string; name: string };

const text = (value: unknown) => String(value ?? '').trim();

export function parseStudentRows(rows: Record<string, unknown>[], classes: SchoolClass[]) {
  const classMap = new Map(classes.flatMap((item) => [
    [item.id.toLowerCase(), item.id],
    [item.name.toLowerCase(), item.id],
  ]));
  const students: Array<Record<string, string>> = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const studentCode = text(row['Mã HS'] ?? row['Mã học sinh'] ?? row.studentCode);
    const fullName = text(row['Họ tên'] ?? row['Họ và tên'] ?? row.fullName);
    const classValue = text(row['Lớp'] ?? row['Mã lớp'] ?? row.className ?? row.classId);
    const classId = classMap.get(classValue.toLowerCase());

    if (!studentCode || !fullName || !classId) {
      errors.push(`Dòng ${index + 2}: thiếu mã học sinh, họ tên hoặc lớp không tồn tại.`);
      return;
    }

    students.push({
      studentCode,
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
