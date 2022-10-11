import { createYoga } from 'graphql-yoga'
import type { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth/next'
import { schema } from '../../graphql/nexus'
import { authOptions } from '../../lib/authOptions'
import prisma from '../../lib/prisma'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default createYoga<{
  req: NextApiRequest
  res: NextApiResponse
}>({
  graphqlEndpoint: '/api/graphql',
  schema,
  async context({ req, res }) {
    const session = await unstable_getServerSession(req, res, authOptions)
    return {
      prisma,
      user: session?.user,
    }
  },
})
