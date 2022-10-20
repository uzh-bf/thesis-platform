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
      <div className="p-4 m-auto mt-4 space-y-4 border rounded max-w-7xl">
        <div className="flex flex-row items-end justify-between">
          <div>Signed in as {session.user.email}</div>
          <Button onClick={() => signOut()}>Sign out</Button>
        </div>

        <div className="flex flex-row gap-4">
          <div className="flex-1 space-y-1">
            {data?.proposals?.map((proposal) => (
              <div key={proposal.id} className="p-1 border rounded">
                {proposal.id} - {proposal.title}
              </div>
            ))}
          </div>

          <div className="flex-1 border rounded shadow">
            <iframe
              className="rounded"
              width="100%"
              height="1000px"
              src="https://forms.office.com/Pages/ResponsePage.aspx?id=2zjkx2LkIkypCsNYsWmAs3FqIECvYGdIv-SlumKwtF1UOE9LV0RPSDRDNE8xNE9HQVJLN0RFTklTRC4u&embed=true"
              // frameborder="0"
              // marginwidth="0"
              // marginheight="0"
              // style="border: none; max-width:100%; max-height:100vh"
              // allowfullscreen
              // webkitallowfullscreen
              // mozallowfullscreen
              // msallowfullscreen
            ></iframe>
          </div>
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
