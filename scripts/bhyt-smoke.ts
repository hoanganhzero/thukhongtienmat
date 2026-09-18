import assert from 'node:assert/strict';
import { isSpecialBhytCategory } from '../lib/bhyt';
assert.equal(isSpecialBhytCategory('student'), false);
assert.equal(isSpecialBhytCategory(null), false);
assert.equal(isSpecialBhytCategory('household'), true);
assert.equal(isSpecialBhytCategory('student_custom'), true);
console.log('BHYT rules smoke: ok');
