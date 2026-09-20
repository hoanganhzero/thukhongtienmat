import assert from 'node:assert/strict';
import { groupPendingFees } from '../lib/payment-qr';

const groups = groupPendingFees([
  { id: '1', studentId: 's1', amount: 100000, student: { studentCode: 'HS001', fullName: 'Trần Văn An', class: { name: '12C2' } }, feeType: { name: 'BHTT', bankAccountNumber: '123', bankAccountName: 'TRUNG TAM', bankName: 'VietinBank' } },
]);

assert.equal(groups.length, 1);
assert.equal(groups[0].amount, 100000);
assert.equal(groups[0].description, 'SEVQR HS001 - Trần Văn An - Lớp 12C2 - BHTT');
console.log('payment QR smoke: ok');
