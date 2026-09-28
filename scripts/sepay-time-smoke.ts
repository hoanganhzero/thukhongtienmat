import assert from 'node:assert/strict';
import { parseSePayDate } from '../app/api/webhooks/sepay/route';

const parsed = parseSePayDate('2026-09-28 15:30:45');
assert(parsed);
assert.equal(parsed.toISOString(), '2026-09-28T08:30:45.000Z');
assert.equal(parsed.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }), '15:30:45 28/9/2026');
console.log('SePay transaction time parsing: OK');
