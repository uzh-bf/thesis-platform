import { objectType } from 'nexus'
import * as ProposalTypes from './proposals'

export const Query = objectType({
  name: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('proposals', {
      type: ProposalTypes.Proposal,
      resolve(_root, _args, ctx) {
        return ctx.prisma.proposal.findMany()
      },
    })
  },
})
