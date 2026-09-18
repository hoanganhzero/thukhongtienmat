import assert from 'node:assert/strict';
import { amountInWords } from '../lib/receipt';
assert.equal(amountInWords(563220), 'Năm trăm sáu mươi ba nghìn hai trăm hai mươi đồng');
console.log('receipt smoke: ok');
