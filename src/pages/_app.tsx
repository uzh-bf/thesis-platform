import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { ThemeProvider } from '@uzh-bf/design-system'
import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { Source_Sans_Pro } from 'next/font/google'

import { trpc } from '../lib/trpc'

config.autoAddCss = false

import '../globals.css'

const sourceSansPro = Source_Sans_Pro({
  variable: '--font-source-sans',
  weight: ['400', '700'],
  subsets: ['latin'],
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
      <ThemeProvider>
        <SessionProvider session={session}>
          <Component {...pageProps} />
        </SessionProvider>
      </ThemeProvider>

      <style jsx global>{`
        :root {
          --font-source-sans: ${sourceSansPro.variable};
        }
      `}</style>
    </div>
  )
}

export default trpc.withTRPC(App)
