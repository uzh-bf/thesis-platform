import { ProposalsDocument } from '@graphql/ops'
import { Button } from '@uzh-bf/design-system'
import { useQuery } from 'urql'

function Overview() {
  const [{ data, fetching, error }] = useQuery({
    query: ProposalsDocument,
  })

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2 text-sm lg:grid-cols-7">
        {data?.proposals?.map((proposal) => (
          <Button
            fluid
            key={proposal.id}
            className="flex flex-col justify-between p-4"
          >
            <div className="font-bold">{proposal.title}</div>
            <div>{proposal.studyLevel}</div>
            <div>{proposal.topicAreas.map((area) => area.name)}</div>
          </Button>
        ))}
      </div>
    </div>
  )
}

export default Overview
