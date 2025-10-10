import { faQuestion } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import { signIn, signOut, useSession } from 'next-auth/react'
import { UserRole } from 'src/lib/constants'
import NewProposalButton from './NewProposalButton'

export default function Header() {
  const { data: session } = useSession()

  const isSupervisor =
    session?.user?.role === UserRole.SUPERVISOR ||
    session?.user?.role === UserRole.DEVELOPER

  const handleLogout = async () => {
    const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID
    
    // Only use Microsoft Entra logout flow if AzureAD is configured (production)
    if (tenantId && tenantId !== '') {
      // Construct the Microsoft Entra logout URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL
      const protocol = appUrl?.includes('localhost') ? 'http' : 'https'
      const postLogoutRedirectUri = `${protocol}://${appUrl}/auth/signout`
      
      // Redirect to Microsoft Entra logout endpoint
      // This will sign out from the Microsoft identity platform
      const logoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`
      
      // Redirect to Microsoft Entra logout, which will then redirect to /auth/signout
      // The /auth/signout page will handle clearing the local NextAuth session
      window.location.href = logoutUrl
    } else {
      // Simple logout for Auth0Provider (dev mode)
      await signOut({ callbackUrl: '/' })
    }
  }

  return (
    <header className="flex flex-col flex-none p-4 text-gray-600 bg-slate-100 md:justify-between md:flex-row">
      <div>
        <NewProposalButton isSupervisor={isSupervisor} />
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        {session?.user && (
          <div className="text-sm md:pr-2">
            Signed in as {session.user.email} ({session.user.role})
          </div>
        )}
        {process.env.NEXT_PUBLIC_DEPARTMENT_NAME === 'DF' ? (
          <a
          href={
            isSupervisor
              ? 'https://www.df.uzh.ch/de/intranet/phd/thesis-supervision.html'
              : 'https://www.df.uzh.ch/en/studies/bachelor-master/thesis/faq.html'
          }
          target="_blank"
        >
          <Button className={{root: "flex items-center gap-1"}}>
            <FontAwesomeIcon icon={faQuestion} />
            FAQ / Documentation
          </Button>
        </a>
        ) : null}
        
        {session?.user ? (
          <Button onClick={handleLogout}>Sign out</Button>
        ) : (
          <Button onClick={() => signIn()}>{process.env.NEXT_PUBLIC_DEPARTMENT_NAME} Supervisor Log-in</Button>
        )}
      </div>
    </header>
  )
}
