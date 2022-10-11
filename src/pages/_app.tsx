import { useGraphQLClient } from '@lib/graphql'
import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { Provider } from 'urql'

import '../globals.css'

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ initialGraphQLState: any; session: Session }>) {
  const graphQLClient = useGraphQLClient(pageProps.initialGraphQLState)

  return (
    <SessionProvider session={session}>
      <Provider value={graphQLClient as any}>
        <Component {...pageProps} />
      </Provider>
    </SessionProvider>
  )
}
