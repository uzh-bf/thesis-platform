import { useEffect } from 'react'
import { isEmbeddedWindow } from 'src/lib/embedding'

/**
 * When the platform runs inside an iframe, report the document height to
 * the embedding page so it can resize the iframe and avoid double
 * scrollbars. Host pages listen for messages of the shape
 * `{ source: 'thesis-platform', type: 'resize', height: number }`.
 * Only the height is posted, so a wildcard target origin is safe.
 */
export default function IframeHeightReporter() {
  useEffect(() => {
    if (!isEmbeddedWindow()) return

    let lastHeight = 0
    const postHeight = () => {
      const height = Math.ceil(document.documentElement.scrollHeight)
      if (height !== lastHeight) {
        lastHeight = height
        window.parent.postMessage(
          { source: 'thesis-platform', type: 'resize', height },
          '*'
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
