import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { trpc } from '../lib/trpc'

import '../globals.css'

function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ initialGraphQLState: any; session: Session }>) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  )
}

export default trpc.withTRPC(App)
