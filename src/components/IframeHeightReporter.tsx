import { useEffect } from 'react'
import { isEmbeddedWindow } from 'src/lib/embedding'

/**
 * Origin of the page embedding this iframe, used as the postMessage
 * target so resize messages are only delivered to the actual host.
 * ancestorOrigins is unavailable in some browsers (e.g. older Firefox);
 * there the origin-level referrer serves as fallback. Returns null when
 * no concrete origin can be determined (e.g. sandboxed embeds or a
 * no-referrer policy) — in that case no messages are sent and the
 * iframe simply scrolls internally.
 */
function getParentOrigin(): string | null {
  const ancestorOrigin = window.location.ancestorOrigins?.[0]
  if (ancestorOrigin && ancestorOrigin !== 'null') return ancestorOrigin

  try {
    if (document.referrer) return new URL(document.referrer).origin
  } catch {
    // ignore malformed referrer
  }

  return null
}

/**
 * When the platform runs inside an iframe, report the document height to
 * the embedding page so it can resize the iframe and avoid double
 * scrollbars. Host pages listen for messages of the shape
 * `{ source: 'thesis-platform', type: 'resize', height: number }`.
 */
export default function IframeHeightReporter() {
  useEffect(() => {
    if (!isEmbeddedWindow()) return

    const parentOrigin = getParentOrigin()
    if (!parentOrigin) return

    let lastHeight = 0
    const postHeight = () => {
      const height = Math.ceil(document.documentElement.scrollHeight)
      if (height !== lastHeight) {
        lastHeight = height
        window.parent.postMessage(
          { source: 'thesis-platform', type: 'resize', height },
          parentOrigin
        )
      }
    }

    postHeight()

    const observer = new ResizeObserver(postHeight)
    observer.observe(document.documentElement)
    observer.observe(document.body)

    window.addEventListener('load', postHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('load', postHeight)
    }
  }, [])

  return null
}
