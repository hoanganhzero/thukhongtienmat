import { normalizePaymentText } from './bank-matching';

export type PendingFee = {
  id: string;
  studentId: string;
  amount: number;
  student: { studentCode: string; fullName: string; class: { name: string }; duplicateNameSuffix?: string };
  feeType: { name: string; bankAccountNumber: string | null; bankAccountName: string | null; bankName: string };
};

export function paymentDescription(student: PendingFee['student'], feeNames: string[]) {
  const feeLabel = feeNames.length === 1 && /bhtt/i.test(feeNames[0]) ? 'BHTT' : feeNames.join(', ');
  const name = student.fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd');
  return 'SEVQR ' + name + (student.duplicateNameSuffix ? ' ' + student.duplicateNameSuffix : '') + ' ' + student.class.name + ' ' + feeLabel;
}

export function groupPendingFees(assignments: PendingFee[]) {
  const duplicateKeys = new Set<string>();
  const nameStudents = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    const key = normalizePaymentText(assignment.student.fullName) + '|' + normalizePaymentText(assignment.student.class.name);
    const ids = nameStudents.get(key) ?? new Set<string>();
    ids.add(assignment.studentId);
    nameStudents.set(key, ids);
  }
  for (const [key, ids] of nameStudents) if (ids.size > 1) duplicateKeys.add(key);
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
    const nameKey = normalizePaymentText(first.student.fullName) + '|' + normalizePaymentText(first.student.class.name);
    const duplicateNameSuffix = duplicateKeys.has(nameKey) ? first.student.studentCode.split('').filter((char) => char >= '0' && char <= '9').join('').slice(-3) : undefined;
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
      description: paymentDescription({ ...first.student, duplicateNameSuffix }, feeNames),
    };
  });
}
