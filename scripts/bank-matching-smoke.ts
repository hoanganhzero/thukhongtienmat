import assert from 'node:assert/strict';
import { findPaymentMatch, paymentCode } from '../lib/bank-matching';

const base = { studentId: 's1', student: { studentCode: 'HS001' } };
const fees = [
  { ...base, id: 'a1', amount: 100_000, qrContent: null, feeType: { name: 'BHYT' } },
  { ...base, id: 'a2', amount: 50_000, qrContent: null, feeType: { name: 'Sổ liên lạc điện tử' } },
];

assert.equal(paymentCode('HS-001'), 'TNHS001');
assert.deepEqual(findPaymentMatch(fees, 150_000, 'TNHS001 TRAN VAN AN'), fees);
assert.deepEqual(findPaymentMatch([{ id: 'b1', studentId: 's1', amount: 100_000, qrContent: null, student: { studentCode: 'HS001', fullName: 'Tran Van An', class: { name: '12C4' } }, feeType: { name: 'BHTT' } }], 100_000, 'SEVQR Tran Van An 12C4 BHTT'), [{ id: 'b1', studentId: 's1', amount: 100_000, qrContent: null, student: { studentCode: 'HS001', fullName: 'Tran Van An', class: { name: '12C4' } }, feeType: { name: 'BHTT' } }]);
const duplicateA = { id: 'd1', studentId: 'd1', amount: 100_000, qrContent: null, student: { studentCode: 'HS345', fullName: 'Tran Van An', class: { name: '12C4' } }, feeType: { name: 'BHTT' } };
const duplicateB = { id: 'd2', studentId: 'd2', amount: 100_000, qrContent: null, student: { studentCode: 'HS678', fullName: 'Tran Van An', class: { name: '12C4' } }, feeType: { name: 'BHTT' } };
assert.deepEqual(findPaymentMatch([duplicateA, duplicateB], 100_000, 'SEVQR Tran Van An 345 12C4 BHTT'), [duplicateA]);
assert.deepEqual(findPaymentMatch(fees, 150_000, 'Nội dung bị cắt', 'TNHS001'), fees);
assert.deepEqual(findPaymentMatch(fees, 100_000, 'TNHS001'), []);
assert.deepEqual(findPaymentMatch(fees, 150_000, 'không có mã'), []);
console.log('Bank matching smoke: ok');
