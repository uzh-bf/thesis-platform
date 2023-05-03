import NextAuth from 'next-auth'
import { authOptions } from 'src/lib/authOptions'

export default NextAuth(authOptions)
