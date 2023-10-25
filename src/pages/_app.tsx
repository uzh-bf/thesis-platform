import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { Source_Sans_3 } from 'next/font/google'

import { trpc } from '../lib/trpc'

import Footer from 'src/components/Footer'
import Header from 'src/components/Header'
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
    <SessionProvider session={session}>
      <div
        id="#__app"
        className={`${sourceSansPro.variable} font-sans antialiased`}
      >
        <Header />

        <Component {...pageProps} />

        <Footer />

        <style jsx global>{`
          :root {
            --theme-font-primary: ${sourceSansPro.variable};
          }

          #__app {
            min-height: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
        `}</style>
      </div>
    </SessionProvider>
  )
}

export default trpc.withTRPC(App)
