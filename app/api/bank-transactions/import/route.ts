export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PAYMENT_ACCOUNT, normalizeAccountNumber } from '@/lib/payment-account';
import * as XLSX from 'xlsx';

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .toUpperCase();
}

function parseDate(value: unknown) {
  const match = String(value ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] ?? 0) - 7, Number(match[5] ?? 0), Number(match[6] ?? 0)));
}

function read(row: Record<string, unknown>, names: string[]) {
  for (const name of names) if (row[name] !== undefined) return row[name];
  return undefined;
}

export async function POST(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const commit = form.get('commit') === 'true';
    if (!(file instanceof File)) return NextResponse.json({ error: 'Chưa chọn tệp Excel' }, { status: 400 });

    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

    const assignments = await prisma.feeAssignment.findMany({
      where: {
        status: { in: ['pending', 'uploaded', 'confirmed'] },
        feeType: {
          isActive: true,
          bankAccountNumber: DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber,
          name: { contains: 'BHT', mode: 'insensitive' },
        },
      },
      include: { student: { include: { class: true } }, feeType: true },
    });

    const alreadyUsed = new Set<string>();
    const results: any[] = [];
    let matched = 0;
    let alreadyConfirmed = 0;
    let review = 0;
    let invalid = 0;

    for (const row of rows) {
      const id = String(read(row, ['ID', 'Id', 'id']) ?? '').trim();
      const referenceCode = String(read(row, ['Mã tham chiếu', 'Ma tham chieu', 'Reference']) ?? '').trim();
      const accountNumber = normalizeAccountNumber(read(row, ['Tài khoản', 'Tai khoan', 'Số tài khoản']));
      const transferType = normalize(read(row, ['Loại giao dịch', 'Loai giao dich']));
      const amount = Number(read(row, ['Tiền', 'Tien', 'Số tiền']) ?? 0);
      const rawContent = String(read(row, ['Nội dung', 'Noi dung', 'Content']) ?? '').trim();
      const normalizedContent = normalize(rawContent);
      const classMatch = normalizedContent.match(/\b((?:10|11|12)[A-Z]+[A-Z0-9]*\d)\b/);
      const className = classMatch?.[1] ?? '';
      const transactionId = id || referenceCode;

      if (!transactionId || accountNumber !== DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber || transferType !== 'TIEN VAO' || amount <= 0) {
        invalid += 1;
        results.push({ transactionId, referenceCode, content: rawContent, status: 'invalid', reason: 'Dòng không phải giao dịch tiền vào đúng tài khoản MB Bank' });
        continue;
      }

      const existingTransaction = await prisma.bankTransaction.findUnique({
        where: { provider_providerTransactionId: { provider: 'sepay-excel', providerTransactionId: transactionId } },
      });
      if (existingTransaction?.status === 'matched') {
        alreadyConfirmed += 1;
        results.push({ transactionId, referenceCode, content: rawContent, status: 'already_confirmed', reason: 'Giao dịch đã được nhập và xác nhận trước đó' });
        continue;
      }

      const candidates = assignments.filter((assignment) =>
        assignment.amount === amount &&
        (!className || normalize(assignment.student.class.name) === className) &&
        normalizedContent.includes(normalize(assignment.student.fullName))
      );
      const uniqueCandidates = candidates.filter((assignment) => !alreadyUsed.has(assignment.id));
      const assignment = uniqueCandidates.length === 1 ? uniqueCandidates[0] : null;

      if (!className || !assignment) {
        review += 1;
        if (commit) {
          await prisma.bankTransaction.upsert({
            where: { provider_providerTransactionId: { provider: 'sepay-excel', providerTransactionId: transactionId } },
            update: {
              accountNumber,
              transactionDate: parseDate(read(row, ['Thời gian', 'Thoi gian'])),
              content: rawContent,
              transferType: 'in',
              transferAmount: amount,
              referenceCode,
              status: 'unmatched',
              rawPayload: row as any,
            },
            create: {
              provider: 'sepay-excel',
              providerTransactionId: transactionId,
              gateway: String(read(row, ['Ngân hàng', 'Ngan hang']) ?? 'MBBank'),
              accountNumber,
              transactionDate: parseDate(read(row, ['Thời gian', 'Thoi gian'])),
              content: rawContent,
              transferType: 'in',
              transferAmount: amount,
              referenceCode,
              status: 'unmatched',
              rawPayload: row as any,
            },
          });
        }
        const possible = candidates.slice(0, 5).map((item) => ({
          assignmentId: item.id,
          studentCode: item.student.studentCode,
          fullName: item.student.fullName,
          className: item.student.class.name,
          currentStatus: item.status,
        }));
        results.push({
          transactionId,
          referenceCode,
          content: rawContent,
          className,
          status: 'review',
          reason: !className ? 'Nội dung không có lớp' : candidates.length > 1 ? 'Có nhiều học sinh cùng khớp' : candidates.length === 1 ? 'Học sinh đã được ghép với giao dịch khác trong tệp' : 'Không tìm thấy đúng họ tên trong lớp',
          possible,
        });
        continue;
      }

      alreadyUsed.add(assignment.id);
      if (assignment.status === 'confirmed') {
        alreadyConfirmed += 1;
        results.push({ transactionId, referenceCode, content: rawContent, className, studentCode: assignment.student.studentCode, fullName: assignment.student.fullName, status: 'already_confirmed', reason: 'Học sinh đã được xác nhận đóng trước đó' });
        continue;
      }

      if (commit) {
        const transactionDate = parseDate(read(row, ['Thời gian', 'Thoi gian']));
        await prisma.$transaction(async (tx) => {
          const transaction = await tx.bankTransaction.upsert({
            where: { provider_providerTransactionId: { provider: 'sepay-excel', providerTransactionId: transactionId } },
            update: {
              accountNumber,
              transactionDate,
              content: rawContent,
              transferType: 'in',
              transferAmount: amount,
              referenceCode,
              matchedAssignmentId: assignment.id,
              status: 'matched',
              rawPayload: row as any,
            },
            create: {
              provider: 'sepay-excel',
              providerTransactionId: transactionId,
              gateway: String(read(row, ['Ngân hàng', 'Ngan hang']) ?? 'MBBank'),
              accountNumber,
              transactionDate,
              content: rawContent,
              transferType: 'in',
              transferAmount: amount,
              referenceCode,
              matchedAssignmentId: assignment.id,
              status: 'matched',
              rawPayload: row as any,
            },
          });
          await tx.feeAssignment.update({ where: { id: assignment.id }, data: { status: 'confirmed', paidAt: transaction.transactionDate ?? new Date() } });
          await tx.notification.create({
            data: {
              studentId: assignment.studentId,
              feeAssignmentId: assignment.id,
              type: 'success',
              channel: 'website',
              message: `Khoản thu ${assignment.feeType.name} đã được xác nhận thanh toán thành công từ dữ liệu giao dịch MB Bank.`,
            },
          });
        });
      }

      matched += 1;
      results.push({
        transactionId,
        referenceCode,
        content: rawContent,
        className,
        studentCode: assignment.student.studentCode,
        fullName: assignment.student.fullName,
        status: commit ? 'confirmed' : 'ready',
        reason: commit ? 'Đã xác nhận' : 'Khớp duy nhất họ tên và lớp',
      });
    }

    return NextResponse.json({
      success: true,
      commit,
      summary: { total: rows.length, matched, alreadyConfirmed, review, invalid },
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể đối chiếu tệp giao dịch' }, { status: 500 });
  }
}
