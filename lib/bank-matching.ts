export type MatchableAssignment = {
  id: string;
  studentId: string;
  amount: number;
  qrContent: string | null;
  student: { studentCode: string };
  feeType: { name: string };
};

export function normalizePaymentText(value?: string | null) {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function paymentCode(studentCode: string) {
  return `TN${studentCode}`.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

export function findPaymentMatch(candidates: MatchableAssignment[], transferAmount: number, rawContent: string, rawCode?: string | null) {
  const content = normalizePaymentText(rawContent);
  const sepayCode = normalizePaymentText(rawCode);
  const groups = new Map<string, MatchableAssignment[]>();
  for (const item of candidates) groups.set(item.studentId, [...(groups.get(item.studentId) ?? []), item]);

  const matches = [...groups.values()].filter((items) => {
    if (items.reduce((sum, item) => sum + item.amount, 0) !== transferAmount) return false;
    const code = paymentCode(items[0].student.studentCode);
    if (content.includes(code) || sepayCode === code) return true;

    const studentCode = normalizePaymentText(items[0].student.studentCode);
    return content.includes(studentCode) && items.every((item) => content.includes(normalizePaymentText(item.feeType.name)));
  });
  if (matches.length === 1) return matches[0];

  const singles = candidates.filter((item) => {
    const qrContent = normalizePaymentText(item.qrContent);
    return item.amount === transferAmount && qrContent.length > 0 && content.includes(qrContent);
  });
  return singles.length === 1 ? singles : [];
}
