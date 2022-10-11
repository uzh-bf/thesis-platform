import { enumType, objectType } from 'nexus'

export const ProposalType = enumType({
  name: 'ProposalType',
  members: ['STUDENT', 'SUPERVISOR'],
})

export const ProposalStatus = enumType({
  name: 'ProposalStatus',
  members: ['OPEN', 'ASSIGNED', 'GRADING', 'CLOSED'],
})

export const Proposal = objectType({
  name: 'Proposal',
  definition(t) {
    t.nonNull.string('id')

    t.nonNull.string('title')
    t.nonNull.string('description')

    t.nonNull.field('type', {
      type: ProposalType,
    })

    t.nonNull.field('status', {
      type: ProposalStatus,
    })
  },
})
