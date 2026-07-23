import { useEffect } from 'react'
import { notifyAuthChange } from 'src/lib/embedding'

/**
 * Landing page for the embedded (popup) sign-in flow. It notifies the
 * embedding window that the auth state changed and closes itself.
 */
export default function PopupComplete() {
  useEffect(() => {
    notifyAuthChange()
    window.close()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">
          Sign-in complete
        </h1>
        <p className="text-gray-600">You can close this window.</p>
      </div>
    </div>
  )
}
