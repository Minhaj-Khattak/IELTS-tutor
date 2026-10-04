import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'IELTS Studio | AI IELTS Learning Platform',
  description:
    'IELTS Studio is a modern IELTS preparation platform with writing practice, speaking, reading, listening, and AI-guided learning.',
  keywords: ['IELTS', 'IELTS Studio', 'IELTS preparation', 'AI tutor', 'band score'],
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
