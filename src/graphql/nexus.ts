import { makeSchema } from 'nexus'
import { join } from 'path'
import * as types from '.'

export const schema = makeSchema({
  types,
  outputs: {
    typegen: join(__dirname, 'generated/nexus-typegen.ts'),
    schema: join(__dirname, 'generated/schema.graphql'),
  },
})
