import { withAuth } from 'next-auth/middleware';
export default withAuth({
  pages: { signIn: '/login' },
  callbacks: { authorized: ({ token }) => !!token },
});
export const config = {
  matcher: ['/((?!api/auth|login|_next|favicon.ico|manifest.webmanifest|sw.js|workbox-.*).*)'],
};
