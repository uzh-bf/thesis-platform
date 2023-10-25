import { faQuestion } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import { signIn, signOut, useSession } from 'next-auth/react'
import { UserRole } from 'src/lib/constants'
import NewProposalButton from './NewProposalButton'

export default function Header() {
  const { data: session } = useSession()

  const isSupervisor = session?.user?.role === UserRole.SUPERVISOR

  return (
    <header className="bg-slate-100 flex flex-col p-4 text-gray-600 md:justify-between md:flex-row flex-none">
      <div>
        <NewProposalButton isSupervisor={isSupervisor} />
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        {session?.user && (
          <div className="text-sm md:pr-2">
            Signed in as {session.user.email} ({session.user.role})
          </div>
        )}
        <a
          href={
            isSupervisor
              ? 'https://www.bf.uzh.ch/de/intranet/phd/thesis-supervision.html'
              : 'https://www.bf.uzh.ch/en/studies/thesis.html'
          }
          target="_blank"
        >
          <Button>
            <Button.Icon>
              <FontAwesomeIcon icon={faQuestion} />
            </Button.Icon>
            <Button.Label>FAQ / Documentation</Button.Label>
          </Button>
        </a>
        {session?.user ? (
          <Button onClick={() => signOut()}>Sign out</Button>
        ) : (
          <Button onClick={() => signIn()}>DBF Supervisor Log-in</Button>
        )}
      </div>
    </header>
  )
}
