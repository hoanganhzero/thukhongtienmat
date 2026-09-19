import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/admin/login',
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;

        // Check User table (signup users)
        const user = await prisma.user.findUnique({ where: { email } });
        if (user?.password) {
          const valid = await bcrypt.compare(password, user.password);
          if (valid) return { id: user.id, name: user.name, email: user.email, role: 'admin' } as any;
        }

        // Check Admin table by username
        const admin = await prisma.admin.findUnique({ where: { username: email } });
        if (admin) {
          const valid = await bcrypt.compare(password, admin.passwordHash);
          if (valid) return { id: admin.id, name: admin.fullName, email: admin.username, role: 'admin', adminRole: admin.role, campusId: admin.campusId, classId: admin.classId } as any;
        }

        return null;
      },
    }),
    CredentialsProvider({
      id: 'admin-login',
      name: 'Admin',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username as string;
        const password = credentials?.password as string;
        if (!username || !password) return null;

        const admin = await prisma.admin.findUnique({ where: { username } });
        if (!admin) return null;

        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) return null;

        return {
          id: admin.id,
          name: admin.fullName,
          email: admin.username,
          role: 'admin',
          adminRole: admin.role,
          campusId: admin.campusId,
          classId: admin.classId,
        } as any;
      },
    }),
    CredentialsProvider({
      id: 'student-login',
      name: 'Student',
      credentials: {
        studentCode: { label: 'Mã học sinh hoặc CCCD', type: 'text' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        const loginId = String(credentials?.studentCode ?? '').trim();
        const password = credentials?.password as string;
        if (!loginId || !password) return null;

        const student = await prisma.student.findFirst({
          where: { OR: [{ studentCode: loginId }, { cccd: loginId }] },
          include: { class: { include: { campus: true } } },
        });
        if (!student) return null;

        const valid = await bcrypt.compare(password, student.passwordHash)
          || (student.passwordIsDefault && [student.studentCode, student.cccd].filter(Boolean).includes(password));
        if (!valid) return null;

        return {
          id: student.id,
          name: student.fullName,
          email: student.studentCode,
          role: 'student',
          studentCode: student.studentCode,
          classId: student.classId,
          className: student.class?.name,
          campusName: student.class?.campus?.name,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.userId = user.id;
        if (user.role === 'admin') {
          token.adminRole = user.adminRole;
          token.campusId = user.campusId;
          token.classId = user.classId;
        }
        if (user.role === 'student') {
          token.studentCode = user.studentCode;
          token.classId = user.classId;
          token.className = user.className;
          token.campusName = user.campusName;
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        if (token.role === 'admin') {
          session.user.adminRole = token.adminRole;
          session.user.campusId = token.campusId;
          session.user.classId = token.classId;
        }
        if (token.role === 'student') {
          session.user.studentCode = token.studentCode;
          session.user.classId = token.classId;
          session.user.className = token.className;
          session.user.campusName = token.campusName;
        }
      }
      return session;
    },
  },
});
