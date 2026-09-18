import assert from 'node:assert/strict';
import { summarizeAssignments } from '../lib/dashboard-stats';

const base = { student: { class: { id: 'c1', name: '12C2', campus: { id: 'p1', name: 'Phân hiệu 1' } } }, feeType: { id: 'bhyt', name: 'BHYT' } };
const stats = summarizeAssignments([{ ...base, amount: 100000, status: 'confirmed' }, { ...base, amount: 50000, status: 'pending' }]);
assert.equal(stats.confirmedAmount, 100000);
assert.equal(stats.classStats[0].rate, 50);
assert.equal(stats.statuses.pending, 1);
console.log('dashboard stats smoke: ok');
