"use client"

import React from "react"
import { KanbanColumn } from "./kanban-column"
import { stages, type Client, type Stage } from "@/lib/mock-data"

interface KanbanBoardProps {
  clients: Client[]
  onClientClick?: (client: Client) => void
}

export function KanbanBoard({ clients, onClientClick }: KanbanBoardProps) {
  // Group clients by stage
  const getClientsForStage = (stage: Stage) =>
    clients.filter((c) => c.stage === stage)

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex h-full min-w-max">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage}
            title={stage}
            clients={getClientsForStage(stage)}
            onClientClick={onClientClick}
          />
        ))}
      </div>
    </div>
  )
}
