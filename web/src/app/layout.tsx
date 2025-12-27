import type { Metadata } from 'next'
import './globals.css'
import { RootLayoutClient } from './layout-client'

export const metadata: Metadata = {
  title: 'PMP Study App',
  description: 'Prepare for the PMP 2026 exam with flashcards and spaced repetition',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  )
}
