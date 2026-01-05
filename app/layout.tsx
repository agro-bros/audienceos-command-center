"use client"

import type React from "react"
import { Inter } from "next/font/google"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import "./globals.css"
import { ChatInterface } from "@/components/chat/chat-interface"
import { useAuth } from "@/hooks/use-auth"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

// Pages where chat should NOT render
const EXCLUDED_PATHS = ["/login", "/invite", "/onboarding"]

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const { profile, agencyId, isLoading, isAuthenticated } = useAuth()
  const [chatPortalHost, setChatPortalHost] = useState<HTMLElement | null>(null)
  const [chatContext, setChatContext] = useState<any>(null)

  // Initialize portal host after DOM is ready
  useEffect(() => {
    setChatPortalHost(document.body)
  }, [])

  // Make setChatContext available globally for pages to set context
  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).setChatContext = setChatContext
    }
  }, [])

  // Determine if chat should be visible
  // Only show chat when:
  // 1. Portal host is ready
  // 2. Not on excluded paths (login, invite, onboarding)
  // 3. Auth check complete (not loading)
  // 4. User is authenticated with valid agencyId
  const shouldShowChat =
    chatPortalHost &&
    !EXCLUDED_PATHS.some((path) => pathname.startsWith(path)) &&
    !isLoading &&
    isAuthenticated &&
    agencyId

  return (
    <html lang="en">
      <body className={`font-sans antialiased ${inter.variable}`} suppressHydrationWarning>
        {children}
        {shouldShowChat &&
          createPortal(
            <ChatInterface
              agencyId={agencyId}
              userId={profile?.id || 'anonymous'}
              context={chatContext}
            />,
            chatPortalHost
          )}
      </body>
    </html>
  )
}
