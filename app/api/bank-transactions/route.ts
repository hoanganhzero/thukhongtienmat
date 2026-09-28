export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PAYMENT_ACCOUNT } from '@/lib/payment-account';

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
    const where = {
      provider: 'sepay',
      status: 'unmatched',
      accountNumber: DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber,
    };

    const [transactions, total, feeTypes] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bankTransaction.count({ where }),
      prisma.feeType.findMany({
        where: {
          isActive: true,
          bankAccountNumber: DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber,
          name: { contains: 'BHT', mode: 'insensitive' },
        },
        select: { amount: true },
      }),
    ]);

    const amounts = feeTypes.map((feeType) => feeType.amount);
    return NextResponse.json({
      transactions: transactions.map((transaction) => {
        const content = normalize(transaction.content);
        let reason = 'Không khớp đúng học sinh hoặc giao dịch bị trùng';
        if (!amounts.some((amount) => amount === transaction.transferAmount)) reason = 'Số tiền không khớp khoản thu BHTT';
        else if (!content.startsWith('SEVQR')) reason = 'Nội dung chuyển khoản không bắt đầu bằng SEVQR';
        else if (!/\b(?:10|11|12)[A-Z]+[A-Z0-9]*\d\b/.test(content)) reason = 'Nội dung thiếu hoặc sai lớp học';
        return { ...transaction, reason };
      }),
      total,
      page,
      limit,
      account: DEFAULT_PAYMENT_ACCOUNT,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể tải giao dịch SePay' }, { status: 500 });
  }
}
