import { DateTimeResolver, JSONObjectResolver } from 'graphql-scalars'
import { asNexusMethod, enumType, objectType } from 'nexus'
import { ProposalStatus, ProposalType } from '../../lib/constants'

export const jsonScalar = asNexusMethod(JSONObjectResolver, 'json')
export const dateTimeScalar = asNexusMethod(DateTimeResolver, 'date')

export const EnumProposalType = enumType({
  name: 'ProposalType',
  members: ProposalType,
})

export const EnumProposalStatus = enumType({
  name: 'ProposalStatus',
  members: ProposalStatus,
})

export const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.string('id')

    t.nonNull.string('name')
    t.nonNull.string('email')
    t.nonNull.string('role')
  },
})

export const TopicArea = objectType({
  name: 'TopicArea',
  definition(t) {
    t.string('id')

    t.string('name')
  },
})

export const Proposal = objectType({
  name: 'Proposal',
  definition(t) {
    t.nonNull.string('id')

    t.nonNull.string('title')
    t.nonNull.string('description')
    t.nonNull.string('language')
    t.nonNull.string('studyLevel')
    t.date('plannedStartAt')

    t.nonNull.field('typeKey', {
      type: EnumProposalType,
    })

    t.nonNull.field('statusKey', {
      type: EnumProposalStatus,
    })

    t.nonNull.list.nonNull.field('topicAreas', {
      type: TopicArea,
    })

    t.nonNull.field('ownedBy', {
      type: User,
    })

    t.field('supervisedBy', {
      type: User,
    })
  },
})
