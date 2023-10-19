import { Button, H1 } from '@uzh-bf/design-system'
import { signIn, signOut, useSession } from 'next-auth/react'

export default function Header() {
  const { data: session } = useSession()

  return (
    <header className="">
      <div className="flex flex-col p-4 text-gray-600 bg-gray-200 md:justify-between md:flex-row">
        <H1 className={{ root: 'text-3xl' }}>DBF Thesis Market</H1>
        <div className="md:flex md:items-center">
          {session?.user ? (
            <>
              <div className="text-sm md:pr-2">
                Signed in as {session.user.email} ({session.user.role})
              </div>
              <Button onClick={() => signOut()}>Sign out</Button>
            </>
          ) : (
            <>
              <Button onClick={() => signIn()}>DBF Supervisor Log-in</Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
