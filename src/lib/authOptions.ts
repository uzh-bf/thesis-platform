import { PrismaAdapter } from '@next-auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import { decode, encode } from 'next-auth/jwt'
import GithubProvider from 'next-auth/providers/github'

import prisma from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  jwt: {
    encode,
    decode,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      return {
        ...token,
        role: user?.role,
      }
    },
    async session({ session, user, token }) {
      session.user.sub = token.sub
      session.user.role = token.role
      return session
    },
  },
}
