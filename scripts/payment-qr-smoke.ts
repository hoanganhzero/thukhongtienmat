import assert from 'node:assert/strict';
import { groupPendingFees } from '../lib/payment-qr';
import { generateQrContent } from '../lib/utils';

const groups = groupPendingFees([
  { id: '1', studentId: 's1', amount: 100000, student: { studentCode: '12345', fullName: 'Trần Quốc Hoàng Anh', class: { name: '12C4' } }, feeType: { name: 'BHTT', bankAccountNumber: '123', bankAccountName: 'TRUNG TAM', bankName: 'VietinBank' } },
]);

assert.equal(groups.length, 1);
assert.equal(groups[0].amount, 100000);
assert.equal(groups[0].description, 'SEVQR 12345 - Tran Quoc Hoang Anh - 12C4 - BHTT');
assert.equal(generateQrContent('BHTT', '12345', 'Trần Quốc Hoàng Anh', '12C4'), 'SEVQR 12345 - Tran Quoc Hoang Anh - 12C4 - BHTT');
console.log('payment QR smoke: ok');
