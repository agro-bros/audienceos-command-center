"use client"

import React from "react"
import { LinearSidebar, type LinearView } from "./sidebar"

interface LinearShellProps {
  activeView: LinearView
  onViewChange: (view: LinearView) => void
  children: React.ReactNode
  detailPanel?: React.ReactNode
}

export function LinearShell({
  activeView,
  onViewChange,
  children,
  detailPanel,
}: LinearShellProps) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <LinearSidebar activeView={activeView} onViewChange={onViewChange} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      {detailPanel && (
        <aside className="w-96 bg-card border-l border-border flex flex-col overflow-hidden">
          {detailPanel}
        </aside>
      )}
    </div>
  )
}
