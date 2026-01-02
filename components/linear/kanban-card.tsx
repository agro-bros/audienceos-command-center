"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, MoreVertical } from "lucide-react"

interface KanbanCardProps {
  id: string
  name: string
  health: "Green" | "Yellow" | "Red" | "Blocked"
  owner: {
    name: string
    initials: string
    color: string
  }
  daysInStage: number
  blocker?: string | null
  tier?: string
  onClick?: () => void
}

function getHealthDotColor(health: string) {
  switch (health) {
    case "Green":
      return "bg-status-green"
    case "Yellow":
      return "bg-status-yellow"
    case "Red":
      return "bg-status-red"
    case "Blocked":
      return "bg-status-blocked"
    default:
      return "bg-muted"
  }
}

function getHealthCheckbox(health: string) {
  if (health === "Green") {
    return (
      <div className="w-4 h-4 bg-status-green rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }
  return (
    <div className={cn("w-4 h-4 rounded-full border-2",
      health === "Red" ? "border-status-red" :
      health === "Yellow" ? "border-status-yellow" :
      health === "Blocked" ? "border-status-blocked" :
      "border-border"
    )} />
  )
}

export function KanbanCard({
  id,
  name,
  health,
  owner,
  daysInStage,
  blocker,
  tier,
  onClick,
}: KanbanCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer group"
    >
      {/* Header row: checkbox, ID, avatar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getHealthCheckbox(health)}
          <span className="text-xs text-muted-foreground font-mono">{id}</span>
        </div>
        <div className="flex items-center gap-1">
          <Avatar className={cn("h-5 w-5", owner.color)}>
            <AvatarFallback className={cn(owner.color, "text-[9px] font-medium text-white")}>
              {owner.initials}
            </AvatarFallback>
          </Avatar>
          <button className="p-1 hover:bg-secondary rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm text-foreground leading-relaxed mb-3">{name}</h4>

      {/* Footer: health dot, days, blocker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", getHealthDotColor(health))} />
          {daysInStage > 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className={cn(
                "text-xs",
                daysInStage > 4 ? "text-status-red font-medium" : "text-muted-foreground"
              )}>
                {daysInStage}d
              </span>
            </div>
          )}
        </div>
        {tier && (
          <span className="text-[10px] text-muted-foreground">{tier}</span>
        )}
      </div>

      {/* Blocker tag */}
      {blocker && (
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] bg-status-red/10 border border-status-red/30 rounded text-status-red">
            {blocker}
          </span>
        </div>
      )}
    </div>
  )
}
