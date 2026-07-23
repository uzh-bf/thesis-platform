import { useEffect, useState } from 'react'
import { isEmbeddedWindow } from '../embedding'

/**
 * Returns true when the app runs inside an iframe. Resolves after mount
 * so server-side rendering and hydration always agree (non-embedded).
 */
export default function useIsEmbedded(): boolean {
  const [isEmbedded, setIsEmbedded] = useState(false)

  useEffect(() => {
    setIsEmbedded(isEmbeddedWindow())
  }, [])

  return isEmbedded
}
