import {
  faArrowLeft,
  faArrowRightArrowLeft,
  faQuestion,
  faRightFromBracket,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import Image from 'next/image'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { UserRole } from 'src/lib/constants'
import { openAuthPopup, watchAuthPopup } from 'src/lib/embedding'
import useIsEmbedded from 'src/lib/hooks/useIsEmbedded'
import useUserRole from 'src/lib/hooks/useUserRole'
import NewProposalButton from './NewProposalButton'

export default function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const { isAdmin } = useUserRole()
  const isEmbedded = useIsEmbedded()

  const isSupervisor =
    session?.user?.role === UserRole.SUPERVISOR ||
    session?.user?.role === UserRole.DEVELOPER

  const isOnAdminPage = router.pathname.startsWith('/admin')

  const departmentName = process.env.NEXT_PUBLIC_DEPARTMENT_NAME?.trim()
  const departmentLongName =
    process.env.NEXT_PUBLIC_DEPARTMENT_LONG_NAME?.trim()

  const OTHER_DEPARTMENT: Record<string, { shortName: string; url: string }> = {
    DF: { shortName: 'IBW', url: 'https://theses.business.uzh.ch' },
    IBW: { shortName: 'DF', url: 'https://theses.df.uzh.ch' },
  }

  const otherDepartment = departmentName
    ? OTHER_DEPARTMENT[departmentName]
    : null
  const organizationName = departmentLongName ?? ''
  const isFaqVisible =
    process.env.NEXT_PUBLIC_FAQ_URL_STUDENT ||
    process.env.NEXT_PUBLIC_FAQ_URL_SUPERVISOR
  const faqUrl =
    (isSupervisor
      ? process.env.NEXT_PUBLIC_FAQ_URL_SUPERVISOR
      : process.env.NEXT_PUBLIC_FAQ_URL_STUDENT) ??
    process.env.NEXT_PUBLIC_FAQ_URL_STUDENT ??
    process.env.NEXT_PUBLIC_FAQ_URL_SUPERVISOR
  const accountLabel = session?.user?.email
    ? `Signed in as ${session.user.email}${
        session.user.role ? ` (${session.user.role})` : ''
      }`
    : undefined

  const serviceButtonClass =
    'rounded-[4px] border-[#0028A5] bg-white px-3 py-1.5 text-sm font-semibold text-[#0028A5] shadow-none hover:bg-[#F5F5FB] hover:text-[#0028A5]'
  const primaryButtonClass =
    'rounded-[4px] border-[#0028A5] bg-[#0028A5] px-3 py-1.5 text-sm font-semibold text-white shadow-none hover:bg-[#001E7C] hover:text-white'

  const handleLogin = () => {
    // Identity providers refuse to render inside iframes, so embedded
    // sign-in runs in a popup; the page reloads once the popup finishes
    if (isEmbedded) {
      const popup = openAuthPopup(
        `/api/auth/signin?callbackUrl=${encodeURIComponent(
          '/auth/popup-complete'
        )}`
      )
      if (popup) {
        watchAuthPopup(popup)
        return
      }
    }

    signIn()
  }

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

      // The Entra logout page cannot be rendered inside an iframe, so in
      // embedded mode it runs in a popup; /auth/signout clears the local
      // session there and notifies this window to reload
      if (isEmbedded) {
        const popup = openAuthPopup(logoutUrl)
        if (popup) {
          watchAuthPopup(popup)
          return
        }

        // Popup blocked: at least clear the local session in place
        await signOut({ redirect: false })
        window.location.reload()
        return
      }

      // Redirect to Microsoft Entra logout, which will then redirect to /auth/signout
      // The /auth/signout page will handle clearing the local NextAuth session
      window.location.href = logoutUrl
    } else {
      // Simple logout for Auth0Provider (dev mode)
      await signOut({ callbackUrl: '/' })
    }
  }

  return (
    <header className="flex-none border-b border-[#E9E9E9] bg-white print:hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[4px] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0028A5] focus:shadow"
      >
        Skip to content
      </a>

      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-10 xl:px-10">
        <div
          className={`flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ${
            isEmbedded ? 'py-3' : 'py-5'
          }`}
        >
          {isEmbedded ? (
            // Embedded pages live inside a branded host page, so a compact
            // title replaces the full UZH branding block
            <div className="min-w-0 truncate text-base font-semibold leading-6 text-[#121212]">
              Thesis Market
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-5">
              <a href="/" aria-label="Universität Zürich" className="shrink-0">
                <Image
                  src="/uzh-logo.svg"
                  alt="Universität Zürich"
                  width={143}
                  height={49}
                  className="h-14 w-auto"
                />
              </a>
              <span
                aria-hidden="true"
                className="hidden h-10 w-px shrink-0 bg-[#E9E9E9] sm:block"
              />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold leading-6 text-[#6B7280]">
                  {organizationName}
                </div>
                <div className="truncate text-lg font-semibold leading-6 text-[#121212]">
                  Thesis Market
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {isOnAdminPage ? (
              <Button
                onClick={() => router.push('/')}
                className={{
                  root: `flex items-center gap-2 ${serviceButtonClass}`,
                }}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Overview
              </Button>
            ) : (
              <NewProposalButton isSupervisor={isSupervisor} />
            )}

            {departmentLongName && otherDepartment && (
              <a
                href={otherDepartment.url}
                target={isEmbedded ? '_blank' : undefined}
                rel={isEmbedded ? 'noreferrer' : undefined}
              >
                <Button
                  className={{
                    root: `flex items-center gap-2 ${serviceButtonClass}`,
                  }}
                >
                  {otherDepartment.shortName}
                  <FontAwesomeIcon icon={faArrowRightArrowLeft} />
                </Button>
              </a>
            )}

            {isAdmin && !isOnAdminPage && (
              <Button
                onClick={() => router.push('/admin')}
                className={{
                  root: `flex items-center gap-2 ${serviceButtonClass}`,
                }}
              >
                <FontAwesomeIcon icon={faUserShield} />
                Admin
              </Button>
            )}

            {isFaqVisible && faqUrl && (
              <a href={faqUrl} target="_blank">
                <Button
                  className={{
                    root: `flex items-center gap-2 ${serviceButtonClass}`,
                  }}
                >
                  <FontAwesomeIcon icon={faQuestion} />
                  FAQ
                </Button>
              </a>
            )}

            {session?.user ? (
              <Button
                onClick={handleLogout}
                title={accountLabel}
                aria-label={
                  accountLabel ? `${accountLabel}. Sign out` : 'Sign out'
                }
                className={{
                  root: `flex items-center gap-2 ${primaryButtonClass}`,
                }}
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                Sign out
              </Button>
            ) : (
              <Button
                onClick={handleLogin}
                className={{ root: primaryButtonClass }}
              >
                {departmentName ?? 'UZH'} Supervisor Log-in
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
