import jwt from 'jsonwebtoken';

const LOOKUP_TOKEN_PURPOSE = 'payment-proof-lookup';

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Thiếu khóa bảo mật hệ thống');
  return secret;
}

export function createLookupToken(studentId: string) {
  return jwt.sign(
    { purpose: LOOKUP_TOKEN_PURPOSE, studentId },
    getSecret(),
    { expiresIn: '30m' },
  );
}

export function getStudentIdFromLookupToken(token: string | null | undefined) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret());
    if (
      typeof payload === 'object' &&
      payload !== null &&
      payload.purpose === LOOKUP_TOKEN_PURPOSE &&
      typeof payload.studentId === 'string'
    ) {
      return payload.studentId;
    }
  } catch {
    return null;
  }
  return null;
}
