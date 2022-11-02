import { PrismaAdapter } from '@next-auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import { decode, encode } from 'next-auth/jwt'
import GithubProvider from 'next-auth/providers/github'
// import AzureADProvider from 'next-auth/providers/azure-ad'

import prisma from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    // AzureADProvider({
    //   clientId: process.env.AZURE_AD_CLIENT_ID as string,
    //   clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string,
    //   tenantId: process.env.AZURE_AD_TENANT_ID as string,
    // }),
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
      session.user.sub = token.sub
      session.user.role = token.role
      return session
    },
  },
}
