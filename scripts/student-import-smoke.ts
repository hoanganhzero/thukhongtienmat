import assert from 'node:assert/strict';
import { parseStudentRows } from '../lib/student-import';

const result = parseStudentRows(
  [{ 'Mã HS': 'HS01', 'Họ tên': 'Nguyễn Văn A', 'Lớp': '10A1' }],
  [{ id: 'class-10a1', name: '10A1' }],
);

assert.equal(result.students[0]?.classId, 'class-10a1');
assert.equal(result.errors.length, 0);
console.log('student import smoke: ok');
