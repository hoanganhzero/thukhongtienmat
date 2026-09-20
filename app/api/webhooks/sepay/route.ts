export const dynamic = 'force-dynamic';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findPaymentMatch } from '@/lib/bank-matching';

type SePayPayload = {
  id?: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content?: string;
  description?: string;
  transferType?: string;
  transferAmount?: number;
  referenceCode?: string;
};

function isValidSignature(rawBody: string, request: Request) {
  const secret = process.env.SEPAY_WEBHOOK_SECRET;
  const signature = request.headers.get('x-sepay-signature') ?? '';
  const timestamp = Number(request.headers.get('x-sepay-timestamp') ?? 0);
  if (!secret || !signature || !timestamp || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const expected = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request)) {
    return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 401 });
  }

  let payload: SePayPayload;
  try {
    payload = JSON.parse(rawBody) as SePayPayload;
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const providerTransactionId = String(payload.id ?? '');
  const transferAmount = Number(payload.transferAmount ?? 0);
  const accountNumber = String(payload.accountNumber ?? '');
  if (!providerTransactionId || !accountNumber || transferAmount <= 0 || String(payload.transferType ?? '').toLowerCase() !== 'in') {
    return NextResponse.json({ success: false, message: 'Invalid transaction' }, { status: 400 });
  }

  let transaction;
  try {
    transaction = await prisma.bankTransaction.upsert({
      where: { provider_providerTransactionId: { provider: 'sepay', providerTransactionId } },
      update: {},
      create: {
        provider: 'sepay',
        providerTransactionId,
        gateway: payload.gateway,
        accountNumber,
        transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : null,
        content: payload.content ?? payload.description ?? '',
        transferType: payload.transferType,
        transferAmount,
        referenceCode: payload.referenceCode,
        rawPayload: payload as any,
      },
    });
  } catch (error: any) {
    console.error('SePay webhook storage error:', error);
    return NextResponse.json({ success: false, message: 'Storage error' }, { status: 500 });
  }
  if (transaction.status === 'matched') return NextResponse.json({ success: true });

  const candidates = await prisma.feeAssignment.findMany({
    where: {
      status: { in: ['pending', 'uploaded'] },
      feeType: { bankAccountNumber: accountNumber },
    },
    include: { student: { include: { class: true } }, feeType: true },
  });
  const matchedAssignments = findPaymentMatch(candidates, transferAmount, payload.content ?? payload.description ?? '', payload.code);

  if (matchedAssignments.length) {
    const assignment = matchedAssignments[0];
    await prisma.$transaction([
      prisma.feeAssignment.updateMany({ where: { id: { in: matchedAssignments.map((item) => item.id) } }, data: { status: 'confirmed', paidAt: new Date() } }),
      prisma.bankTransaction.update({
        where: { provider_providerTransactionId: { provider: 'sepay', providerTransactionId } },
        data: { matchedAssignmentId: assignment.id, status: 'matched' },
      }),
      prisma.notification.createMany({ data: matchedAssignments.map((item) => ({
        studentId: item.studentId,
        feeAssignmentId: item.id,
        type: 'success',
        channel: 'website',
        message: `Khoản thu ${item.feeType.name} đã được tự động xác nhận thanh toán thành công.`,
      })) }),
    ]);
  } else {
    console.warn(`SePay transaction ${providerTransactionId} was not auto-matched.`);
  }

  return NextResponse.json({ success: true });
}
