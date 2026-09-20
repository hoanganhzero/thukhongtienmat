export type PendingFee = {
  id: string;
  studentId: string;
  amount: number;
  student: { studentCode: string; fullName: string; class: { name: string } };
  feeType: { name: string; bankAccountNumber: string | null; bankAccountName: string | null; bankName: string };
};

export function paymentDescription(student: PendingFee['student'], feeNames: string[]) {
  const feeLabel = feeNames.length === 1 && /bhtt/i.test(feeNames[0]) ? 'BHTT' : feeNames.join(', ');
  const name = student.fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd');
  return 'SEVQR ' + name + ' ' + student.class.name + ' ' + feeLabel;
}

export function groupPendingFees(assignments: PendingFee[]) {
  const groups = new Map<string, PendingFee[]>();
  for (const assignment of assignments) {
    const account = assignment.feeType.bankAccountNumber;
    if (!account) continue;
    const key = assignment.studentId + ':' + account;
    groups.set(key, [...(groups.get(key) ?? []), assignment]);
  }

  return [...groups.values()].map((items) => {
    const first = items[0];
    const feeNames = items.map((item) => item.feeType.name);
    return {
      studentId: first.studentId,
      studentCode: first.student.studentCode,
      fullName: first.student.fullName,
      className: first.student.class.name,
      assignmentIds: items.map((item) => item.id),
      feeNames,
      amount: items.reduce((sum, item) => sum + item.amount, 0),
      accountNo: first.feeType.bankAccountNumber!,
      accountName: first.feeType.bankAccountName ?? '',
      bankName: first.feeType.bankName,
      description: paymentDescription(first.student, feeNames),
    };
  });
}
