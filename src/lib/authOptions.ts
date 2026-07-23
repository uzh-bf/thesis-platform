import { PrismaAdapter } from '@next-auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import { decode, encode } from 'next-auth/jwt'
import Auth0Provider from 'next-auth/providers/auth0'
import AzureADProvider from 'next-auth/providers/azure-ad'
// import EmailProvider from 'next-auth/providers/email'

import prisma from '../server/prisma'
import { UserRole } from './constants'
const isStagingEnvironment = () =>
  (process.env.THESIS_PLATFORM_ENV ?? '').trim().toLowerCase() === 'stg'

// The platform can be embedded in an iframe on other (sub-)domains. For the
// session to work in a cross-site iframe the auth cookies need
// SameSite=None, which browsers only accept together with Secure. Cookie
// names stay identical to the NextAuth defaults so existing sessions
// remain valid; on plain HTTP (local dev) the defaults are kept as-is.
const useSecureCookies = (process.env.NEXTAUTH_URL ?? '').startsWith(
  'https://'
)
const cookiePrefix = useSecureCookies ? '__Secure-' : ''
const cookieSameSite = useSecureCookies ? 'none' : 'lax'

const getSessionUser = (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
  })

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // EmailProvider({
    //   server: {
    //     host: process.env.EMAIL_SERVER_HOST,
    //     port: process.env.EMAIL_SERVER_PORT,
    //     auth: {
    //       user: process.env.EMAIL_SERVER_USER,
    //       pass: process.env.EMAIL_SERVER_PASSWORD,
    //     },
    //   },
    //   from: process.env.EMAIL_FROM,
    // }),
    !isStagingEnvironment() &&
      typeof process.env.AZURE_AD_CLIENT_ID === 'string' &&
      process.env.AZURE_AD_CLIENT_ID !== '' &&
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID as string,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string,
        tenantId: process.env.AZURE_AD_TENANT_ID as string,
        authorization: {
          params: {
            prompt: 'login', // Force users to re-enter credentials on each login
            scope: 'openid profile email',
          },
        },
        // Allow linking OAuth account to existing user with same email
        allowDangerousEmailAccountLinking: true,
      }),
    typeof process.env.AUTH0_CLIENT_ID === 'string' &&
      process.env.AUTH0_CLIENT_ID !== '' &&
      (Auth0Provider({
        clientId: process.env.AUTH0_CLIENT_ID as string,
        clientSecret: process.env.AUTH0_CLIENT_SECRET as string,
        issuer: process.env.AUTH0_ISSUER as string,
        // Allow linking OAuth account to existing user with same email
        allowDangerousEmailAccountLinking: true,
      }) as any),
  ],
  session: {
    strategy: 'jwt',
  },
  jwt: {
    encode,
    decode,
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: cookieSameSite,
        path: '/',
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        sameSite: cookieSameSite,
        path: '/',
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `${useSecureCookies ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: cookieSameSite,
        path: '/',
        secure: useSecureCookies,
      },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: cookieSameSite,
        path: '/',
        secure: useSecureCookies,
        maxAge: 60 * 15,
      },
    },
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: cookieSameSite,
        path: '/',
        secure: useSecureCookies,
        maxAge: 60 * 15,
      },
    },
    nonce: {
      name: `${cookiePrefix}next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: cookieSameSite,
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  // Add events to handle user creation
  events: {
    async createUser({ user }) {
      // Update the newly created user with department from environment variable
      await prisma.user.update({
        where: { id: user.id },
        data: {
          department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as any, // Cast as any since department is an enum
        },
      });
    },
    async signOut({ token }) {
      // This event is called when the user signs out
      // The session will be cleared automatically by NextAuth
      console.log('User signed out:', token.sub);
    },
  },
  callbacks: {
    async jwt({ token, user, account, profile, trigger }) {
      if (account && user) {
        // Fetch the full user with role from database
        const dbUser = await getSessionUser(user.id)
        
        token.sub = user.id
        token.role = dbUser?.role || 'UNSET'
        token.adminRole = dbUser?.adminRole ?? 'UNSET'
        token.isAdmin = token.adminRole !== 'UNSET'
      } else if (trigger === 'update' || token.adminRole === undefined || token.adminRole !== 'ADMIN') {
        // Refresh user data from database on session update or if user is not admin
        // This allows immediate reflection when admin access is granted (just refresh the page)
        // Once user becomes admin, we stop checking the database on every request
        const dbUser = await getSessionUser(token.sub as string)
        
        if (dbUser) {
          token.role = dbUser.role
          token.adminRole = dbUser.adminRole
          token.isAdmin = dbUser.adminRole !== 'UNSET'
        }
      }
      return token
    },
    async session({ session, user, token }) {
      if (session.user && token.sub && token.role) {
        session.user.sub = token.sub as string
        session.user.role = token.role as UserRole
        session.user.isAdmin = token.isAdmin as boolean
        session.user.adminRole = token.adminRole as any
      }
      return session
    },
  },
}
