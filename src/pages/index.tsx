import { ProposalsDocument } from '@graphql/ops'
import { Button } from '@uzh-bf/design-system'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useQuery } from 'urql'

function Index() {
  const { data: session } = useSession()

  const [{ data, fetching, error }] = useQuery({
    query: ProposalsDocument,
  })

  if (session?.user) {
    return (
      <div className="max-w-5xl p-4 m-auto mt-4 space-y-4 border rounded">
        <div className="flex flex-row items-end justify-between">
          <div>Signed in as {session.user.email}</div>
          <Button onClick={() => signOut()}>Sign out</Button>
        </div>

        <div className="space-y-1">
          {data?.proposals?.map((proposal) => (
            <div key={proposal.id} className="p-1 border rounded">
              {proposal.id} - {proposal.title}
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-row items-center justify-between max-w-5xl p-4 m-auto mt-4 space-y-4 border rounded">
      Not signed in
      <Button onClick={() => signIn()}>Sign in</Button>
    </div>
  )
}

export default Index
