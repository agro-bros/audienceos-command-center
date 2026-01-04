import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
      <body className={`font-sans antialiased ${inter.variable}`} suppressHydrationWarning>{children}</body>
    </html>
  )
}
