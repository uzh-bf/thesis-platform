import { ContextWithUser } from '@type/app'
import { objectType } from 'nexus'
import { UserRole } from '../../lib/constants'
import * as ProposalTypes from './proposals'

export const Query = objectType({
  name: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('proposals', {
      type: ProposalTypes.Proposal,
      async resolve(_root, _args, ctx: ContextWithUser) {
        const proposals = await ctx.prisma.proposal.findMany({
          where: {
            typeKey: {
              in:
                ctx.user.role === UserRole.SUPERVISOR
                  ? ['SUPERVISOR', 'STUDENT']
                  : ['SUPERVISOR'],
            },
          },
        })

        return proposals
      },
    })
  },
})
