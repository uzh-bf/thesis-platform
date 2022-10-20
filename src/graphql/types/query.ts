import { ContextWithUser } from '@type/app'
import { objectType } from 'nexus'
import * as ProposalTypes from './proposals'

export const Query = objectType({
  name: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('proposals', {
      type: ProposalTypes.Proposal,
      async resolve(_root, _args, ctx: ContextWithUser) {
        const proposals = await ctx.prisma.proposal.findMany()
        return proposals.map((proposal) => ({
          ...proposal,
          status: proposal.statusKey,
          type: proposal.typeKey,
        }))
      },
    })
  },
})
