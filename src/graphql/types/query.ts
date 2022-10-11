import { objectType } from 'nexus'
import { Proposal } from './proposals'

export const Query = objectType({
  name: 'Query',
  definition(t) {
    t.list.nonNull.field('proposals', {
      type: Proposal,
      resolve(_root, _args, ctx) {
        return ctx.prisma.proposal.findMany()
      },
    })
  },
})
