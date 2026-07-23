export const AUTH_POPUP_NAME = 'thesis-platform-auth'
export const AUTH_BROADCAST_CHANNEL = 'thesis-platform:auth'

/**
 * Whether the app is currently rendered inside an iframe. Accessing
 * window.top can throw for cross-origin parents, which also means we
 * are embedded.
 */
export function isEmbeddedWindow(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

/**
 * Open a centered popup for authentication flows. Identity providers
 * (Microsoft Entra, Auth0) refuse to render inside iframes, so embedded
 * sign-in/sign-out has to leave the frame.
 */
export function openAuthPopup(url: string): Window | null {
  const width = 520
  const height = 720
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2)
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2)

  return window.open(
    url,
    AUTH_POPUP_NAME,
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`
  )
}

/** Notify other same-origin windows (e.g. the embedding iframe) that the auth state changed. */
export function notifyAuthChange(): void {
  try {
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
    channel.postMessage('auth-changed')
    channel.close()
  } catch {
    // BroadcastChannel unavailable — the opener detects the closed popup instead
  }
}

/**
 * Reload the current window once the auth popup finishes (either via
 * broadcast from the popup or because the popup was closed).
 */
export function watchAuthPopup(popup: Window): void {
  let done = false
  let channel: BroadcastChannel | null = null
  let interval: number | undefined

  const finish = () => {
    if (done) return
    done = true
    if (interval !== undefined) window.clearInterval(interval)
    channel?.close()
    window.location.reload()
  }

  try {
    channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
    channel.onmessage = finish
  } catch {
    // fall back to polling only
  }

  interval = window.setInterval(() => {
    if (popup.closed) finish()
  }, 500)
}
