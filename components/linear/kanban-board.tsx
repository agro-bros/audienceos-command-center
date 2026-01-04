"use client"

import React from "react"
import { KanbanColumn } from "./kanban-column"
import { PIPELINE_STAGES, type Stage, type MinimalClient } from "@/types/client"

interface KanbanBoardProps {
  clients: MinimalClient[]
  onClientClick?: (client: MinimalClient) => void
}

export function KanbanBoard({ clients, onClientClick }: KanbanBoardProps) {
  // Group clients by stage
  const getClientsForStage = (stage: Stage) =>
    clients.filter((c) => c.stage === stage)

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex h-full min-w-max">
        {PIPELINE_STAGES.map((stage) => (
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
