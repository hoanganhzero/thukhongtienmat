type SchoolClass = { id: string; name: string; campusId?: string; schoolYear?: string; campus?: { id?: string; name?: string } };

const text = (value: unknown) => String(value ?? '').trim();

function validIsoDate(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function normalizeDateOfBirth(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return validIsoDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(value)));
    return validIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const raw = text(value);
  let match = /^(\\d{1,2})[\\/.-](\\d{1,2})[\\/.-](\\d{4})$/.exec(raw);
  if (match) return validIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
  match = /^(\\d{4})[\\/.-](\\d{1,2})[\\/.-](\\d{1,2})$/.exec(raw);
  if (match) return validIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  return '';
}
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
      dateOfBirth: normalizeDateOfBirth(row['Ngày sinh'] ?? row.dateOfBirth),
    });
  });

  return { students, errors };
}
