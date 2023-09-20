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
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID as string,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string,
        tenantId: process.env.AZURE_AD_TENANT_ID as string,
      }),
    process.env.NODE_ENV !== 'production' &&
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
