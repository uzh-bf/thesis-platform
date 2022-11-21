import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { trpc } from '../lib/trpc'

import '../globals.css'

import { Source_Sans_Pro } from '@next/font/google'

const sourceSans = Source_Sans_Pro({
  variable: '--font-source-sans',
  weight: ['400', '700'],
  subsets: ['latin'],
})

function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ initialGraphQLState: any; session: Session }>) {
  return (
    <SessionProvider session={session}>
      <div className={`${sourceSans.variable} font-sans antialiased`}>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  )
}

export default trpc.withTRPC(App)
