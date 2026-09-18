type Assignment = {
  amount: number;
  status: string;
  student: { class: { id: string; name: string; campus: { id: string; name: string } } };
  feeType: { id: string; name: string };
};

export function summarizeAssignments(assignments: Assignment[]) {
  const statuses = { pending: 0, uploaded: 0, confirmed: 0, rejected: 0 };
  const campuses = new Map<string, any>();
  const classes = new Map<string, any>();
  const feeTypes = new Map<string, any>();
  let totalAmount = 0;
  let confirmedAmount = 0;

  for (const item of assignments) {
    if (item.status in statuses) statuses[item.status as keyof typeof statuses]++;
    totalAmount += item.amount;
    if (item.status === 'confirmed') confirmedAmount += item.amount;
    const dimensions = [
      [campuses, item.student.class.campus.id, item.student.class.campus.name],
      [classes, item.student.class.id, item.student.class.name],
      [feeTypes, item.feeType.id, item.feeType.name],
    ] as const;
    for (const [map, id, name] of dimensions) {
      const row = map.get(id) ?? { id, name, total: 0, confirmed: 0, pending: 0, totalAmount: 0, confirmedAmount: 0 };
      row.total++;
      row.totalAmount += item.amount;
      if (item.status === 'confirmed') { row.confirmed++; row.confirmedAmount += item.amount; } else row.pending++;
      map.set(id, row);
    }
  }

  const finish = (values: any[]) => values.map((row) => ({ ...row, rate: row.total ? Math.round(row.confirmed * 100 / row.total) : 0 }));
  return { statuses, totalAmount, confirmedAmount, campusStats: finish([...campuses.values()]), classStats: finish([...classes.values()]), feeTypeStats: finish([...feeTypes.values()]) };
}
