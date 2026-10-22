import { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(creds) {
  try {
    console.log('🔍 [LOGIN ATTEMPT]', creds?.email);
    if (!creds?.email || !creds?.password) return null;

    const user = await prisma.user.findUnique({ where: { email: creds.email } });
    console.log('👤 [USER FOUND]', user ? 'YES' : 'NO', user?.active);

    if (!user || !user.active) return null;

    const ok = await bcrypt.compare(creds.password, user.password);
    console.log('🔑 [PASSWORD MATCH]', ok);

    if (!ok) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  } catch (error) {
    console.error('❌ [AUTH ERROR]', error);
    return null;
  }
},
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = user.role; }
      return token;
    },
    async session({ session, token }) {
      session.user = { ...session.user, id: token.id as string, role: token.role as any };
      return session;
    },
  },
};
