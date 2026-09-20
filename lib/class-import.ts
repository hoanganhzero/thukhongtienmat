type Lookup = { id: string; name: string };

const text = (value: unknown) => String(value ?? '').trim();

export function parseClassRows(rows: Record<string, unknown>[], campuses: Lookup[]) {
  const campusMap = new Map(campuses.flatMap((item) => [
    [item.id.toLowerCase(), item.id],
    [item.name.toLowerCase(), item.id],
  ]));
  const classes: Array<Record<string, string>> = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const name = text(row['Tên lớp'] ?? row['Lớp'] ?? row.name);
    const campusValue = text(row['Cơ sở'] ?? row['Điểm trường'] ?? row.campusName ?? row.campusId);
    const campusId = campusMap.get(campusValue.toLowerCase());
    const schoolYear = text(row['Năm học'] ?? row.schoolYear) || '2025-2026';
    const teacherName = text(row['GVCN'] ?? row['Giáo viên chủ nhiệm'] ?? row.teacherName);

    if (!name || !campusId) {
      errors.push(`Dòng ${index + 2}: thiếu tên lớp hoặc cơ sở không tồn tại.`);
      return;
    }
    classes.push({ name, campusId, schoolYear, teacherName });
  });

  return { classes, errors };
}
