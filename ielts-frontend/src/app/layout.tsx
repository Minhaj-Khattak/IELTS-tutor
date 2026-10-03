import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'IELTS AI Examiner — Instant Essay Grading',
  description:
    'Get your IELTS Task 2 essay graded instantly by an AI examiner. Receive band scores, sub-scores, and line-by-line corrections based on official IELTS criteria.',
  keywords: ['IELTS', 'essay grading', 'AI examiner', 'band score', 'IELTS preparation'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
