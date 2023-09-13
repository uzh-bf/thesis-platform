import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { Source_Sans_3 } from 'next/font/google'

import { trpc } from '../lib/trpc'

import '../globals.css'

config.autoAddCss = false

const sourceSansPro = Source_Sans_3({
  subsets: ['latin'],
  variable: '--source-sans-pro',
  weight: ['300', '400', '700'],
})

function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ initialGraphQLState: any; session: Session }>) {
  return (
    <div
      id="#__app"
      className={`${sourceSansPro.variable} font-sans antialiased h-full min-h-full`}
    >
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>

      <style jsx global>{`
        :root {
          --theme-font-primary: ${sourceSansPro.variable};
        }
      `}</style>
    </div>
  )
}

export default trpc.withTRPC(App)
