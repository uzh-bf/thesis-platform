import { useGraphQLClient } from '@lib/graphql'
import localFont from '@next/font/local'
import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { Provider } from 'urql'

import '../globals.css'

export const FontTheSansBold = localFont({
  src: '../../public/woff/thesans-bold.woff2',
  weight: 'bold',
  variable: '--font-thesans-bold',
})
export const FontTheSansPlain = localFont({
  src: '../../public/woff/thesans-plain.woff2',
  weight: 'normal',
  variable: '--font-thesans-plain',
})

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ initialGraphQLState: any; session: Session }>) {
  const graphQLClient = useGraphQLClient(pageProps.initialGraphQLState)

  return (
    <SessionProvider session={session}>
      <Provider value={graphQLClient as any}>
        <div
          className={`${FontTheSansBold.variable} ${FontTheSansPlain.variable}`}
        >
          <Component {...pageProps} />
        </div>
      </Provider>
    </SessionProvider>
  )
}
