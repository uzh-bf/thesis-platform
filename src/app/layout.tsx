import Link from 'next/link'
import { PropsWithChildren } from 'react'

import '../globals.css'

function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>

      <body className="h-full">
        <header>
          <nav className="flex flex-row gap-2 p-4 border">
            <Link href="/">Home</Link>
            <Link href="/theses">Theses</Link>
          </nav>
        </header>

        <main className="h-full p-4">{children}</main>
      </body>
    </html>
  )
}

export default RootLayout
