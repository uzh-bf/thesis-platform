import { enumType, objectType } from 'nexus'
import { ProposalStatus, ProposalType } from '../../lib/constants'

export const EnumProposalType = enumType({
  name: 'ProposalType',
  members: ProposalType,
})

export const EnumProposalStatus = enumType({
  name: 'ProposalStatus',
  members: ProposalStatus,
})

export const Proposal = objectType({
  name: 'Proposal',
  definition(t) {
    t.nonNull.string('id')

    t.nonNull.string('title')
    t.nonNull.string('description')

    t.nonNull.field('type', {
      type: EnumProposalType,
    })

    t.nonNull.field('status', {
      type: EnumProposalStatus,
    })
  },
})
