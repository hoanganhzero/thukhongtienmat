import assert from 'node:assert/strict';
import { findPaymentMatch, paymentCode } from '../lib/bank-matching';

const base = { studentId: 's1', student: { studentCode: 'HS001' } };
const fees = [
  { ...base, id: 'a1', amount: 100_000, qrContent: null, feeType: { name: 'BHYT' } },
  { ...base, id: 'a2', amount: 50_000, qrContent: null, feeType: { name: 'Sổ liên lạc điện tử' } },
];

assert.equal(paymentCode('HS-001'), 'TNHS001');
assert.deepEqual(findPaymentMatch(fees, 150_000, 'TNHS001 TRAN VAN AN'), fees);\nassert.deepEqual(findPaymentMatch([{ ...base, id: 'b1', amount: 100_000, qrContent: null, feeType: { name: 'BHTT' } }], 100_000, 'SEVQR HS001 - TRAN VAN AN - 12C4 - BHTT'), [{ ...base, id: 'b1', amount: 100_000, qrContent: null, feeType: { name: 'BHTT' } }]);
assert.deepEqual(findPaymentMatch(fees, 150_000, 'Nội dung bị cắt', 'TNHS001'), fees);
assert.deepEqual(findPaymentMatch(fees, 100_000, 'TNHS001'), []);
assert.deepEqual(findPaymentMatch(fees, 150_000, 'không có mã'), []);
console.log('Bank matching smoke: ok');
