import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Jost } from "next/font/google"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-jost",
})

// <CHANGE> Updated metadata for AudienceOS
export const metadata: Metadata = {
  title: "AudienceOS Command Center",
  description: "Client Fulfillment Command Center",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${jost.variable}`} suppressHydrationWarning>{children}</body>
    </html>
  )
}
