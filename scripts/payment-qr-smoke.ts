import assert from 'node:assert/strict';
import { groupPendingFees } from '../lib/payment-qr';

const groups = groupPendingFees([
  { id: '1', studentId: 's1', amount: 100000, student: { studentCode: 'HS001', fullName: 'Trần Văn An', class: { name: '12C2' } }, feeType: { name: 'BHYT', bankAccountNumber: '123', bankAccountName: 'TRUNG TAM', bankName: 'Agribank' } },
  { id: '2', studentId: 's1', amount: 50000, student: { studentCode: 'HS001', fullName: 'Trần Văn An', class: { name: '12C2' } }, feeType: { name: 'BHTT', bankAccountNumber: '123', bankAccountName: 'TRUNG TAM', bankName: 'Agribank' } },
]);

assert.equal(groups.length, 1);
assert.equal(groups[0].amount, 150000);
assert.equal(groups[0].description, 'TNHS001 - Trần Văn An - Lớp 12C2 - Thanh toán tiền BHYT, BHTT');
console.log('payment QR smoke: ok');
