import assert from 'node:assert/strict';
import { getVietQrBankBin } from '../lib/vietqr-banks';
import { buildVietQrUrl } from '../lib/utils';

assert.equal(getVietQrBankBin('Agribank'), '970405');
assert.equal(getVietQrBankBin('Vietcombank'), '970436');
assert.equal(getVietQrBankBin('MBBank'), '970422');
assert.match(buildVietQrUrl('123456', 100000, 'TNHS001', 'NGUYEN VAN A', 'BIDV'), /970418-123456/);
console.log('VietQR banks smoke: ok');
