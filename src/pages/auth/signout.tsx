import { signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { AUTH_POPUP_NAME, notifyAuthChange } from 'src/lib/embedding'

export default function SignOut() {
  const router = useRouter()

  useEffect(() => {
    // Clear the local NextAuth session after being redirected from Microsoft Entra
    const performSignOut = async () => {
      await signOut({ redirect: false })

      // When this page runs inside the embedded-mode auth popup, notify the
      // embedding window and close the popup instead of navigating
      if (window.name === AUTH_POPUP_NAME || window.opener) {
        notifyAuthChange()
        window.close()
        return
      }

      // Redirect to home page after clearing local session
      router.push('/')
    }

    performSignOut()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Signing out...
        </h1>
        <p className="text-gray-600">Please wait while we complete your logout.</p>
      </div>
    </div>
  )
}
