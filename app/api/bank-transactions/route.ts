export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase();
}

export async function GET(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 100)));
    const where = { provider: 'sepay', status: 'unmatched' };

    const [transactions, total, feeTypes] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bankTransaction.count({ where }),
      prisma.feeType.findMany({
        where: { isActive: true },
        select: { bankAccountNumber: true, amount: true },
      }),
    ]);

    const feeTypesByAccount = new Map<string, number[]>();
    for (const feeType of feeTypes) {
      const account = String(feeType.bankAccountNumber ?? '').replace(/\D/g, '');
      if (!account) continue;
      feeTypesByAccount.set(account, [...(feeTypesByAccount.get(account) ?? []), feeType.amount]);
    }

    return NextResponse.json({
      transactions: transactions.map((transaction) => {
        const account = transaction.accountNumber.replace(/\D/g, '');
        const amounts = feeTypesByAccount.get(account);
        const content = normalize(transaction.content);
        let reason = 'Không khớp học sinh, lớp hoặc khoản thu chưa được gán';

        if (!amounts) reason = 'Tài khoản nhận chưa được cấu hình cho khoản thu';
        else if (!amounts.some((amount) => amount === transaction.transferAmount)) reason = 'Số tiền không khớp khoản thu đã cấu hình';
        else if (!content.includes('SEVQR')) reason = 'Nội dung chuyển khoản thiếu SEVQR';
        else if (!/\b(?:10|11|12)[A-Z]+[A-Z0-9]*\d\b/.test(content)) reason = 'Nội dung thiếu hoặc sai lớp học';

        return { ...transaction, reason };
      }),
      total,
      page,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể tải giao dịch SePay' }, { status: 500 });
  }
}
