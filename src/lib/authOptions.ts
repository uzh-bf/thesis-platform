import { PrismaAdapter } from '@next-auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import { decode, encode } from 'next-auth/jwt'
import Auth0Provider from 'next-auth/providers/auth0'
import AzureADProvider from 'next-auth/providers/azure-ad'
// import EmailProvider from 'next-auth/providers/email'

import prisma from '../server/prisma'

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
      }),
    typeof process.env.AUTH0_CLIENT_ID === 'string' &&
      process.env.AUTH0_CLIENT_ID !== '' &&
      (Auth0Provider({
        clientId: process.env.AUTH0_CLIENT_ID as string,
        clientSecret: process.env.AUTH0_CLIENT_SECRET as string,
        issuer: process.env.AUTH0_ISSUER as string,
      }) as any),
  ],
  session: {
    strategy: 'jwt',
  },
  jwt: {
    encode,
    decode,
  },
  // Add events to handle user creation
  events: {
    async createUser({ user }) {
      // Update the newly created user with department from environment variable
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as any // Cast as any since department is an enum
        }
      });
    },
    async signOut({ token }) {
      // This event is called when the user signs out
      // The session will be cleared automatically by NextAuth
      console.log('User signed out:', token.sub);
    },
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account) {
        token.sub = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, user, token }) {
      if (session.user && token.sub && token.role) {
        session.user.sub = token.sub
        session.user.role = token.role
      }
      return session
    },
  },
}
