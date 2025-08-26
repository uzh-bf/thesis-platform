import { NextApiRequest, NextApiResponse } from 'next'
import cors from 'nextjs-cors'
import { createOpenApiNextHandler } from 'trpc-to-openapi'

import { createContext } from 'src/server/context'
import { appRouter } from 'src/server/routers/_app'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Setup CORS
  await cors(req, res)

  // Handle incoming OpenAPI requests
  const openApiHandler = createOpenApiNextHandler({
    router: appRouter,
    createContext,
    responseMeta: () => ({
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }),
  })

  return openApiHandler(req, res)
}

export default handler
