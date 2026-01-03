"use client"

import { useState, useMemo } from "react"
import {
  LinearKPICard,
  LinearKPICardSkeleton,
  FirehoseFeed,
  DashboardTabs,
  type LinearKPIData,
  type FirehoseItemData,
  type DashboardTab,
  type FirehoseTab,
} from "./dashboard"
import { type Client, owners } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { MessageSquare, Send } from "lucide-react"

interface DashboardViewProps {
  clients: Client[]
  onClientClick: (client: Client) => void
}

// Mock firehose data - will be replaced with real data
function generateMockFirehoseItems(clients: Client[]): FirehoseItemData[] {
  const items: FirehoseItemData[] = []
  const now = new Date()

  // Add some critical items
  clients.filter(c => c.health === "Red").forEach(client => {
    items.push({
      id: `alert-${client.id}`,
      severity: "critical",
      title: client.blocker || "Client at Risk",
      description: `${client.name} needs immediate attention - ${client.statusNote || "health is red"}`,
      timestamp: new Date(now.getTime() - Math.random() * 4 * 60 * 60 * 1000),
      clientName: client.name,
      clientId: client.id,
      targetTab: "alerts",
    })
  })

  // Add stage move events
  clients.slice(0, 3).forEach(client => {
    items.push({
      id: `stage-${client.id}`,
      severity: "info",
      title: "Stage Move",
      description: `${client.name} moved to ${client.stage}`,
      timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
      clientName: client.name,
      clientId: client.id,
      targetTab: "clients",
    })
  })

  // Add some warnings
  clients.filter(c => c.health === "Yellow").forEach(client => {
    items.push({
      id: `warn-${client.id}`,
      severity: "warning",
      title: "Needs Attention",
      description: `${client.name} - ${client.statusNote || "review recommended"}`,
      timestamp: new Date(now.getTime() - Math.random() * 8 * 60 * 60 * 1000),
      clientName: client.name,
      clientId: client.id,
      targetTab: "clients",
    })
  })

  // Add task items
  items.push({
    id: "task-1",
    severity: "warning",
    title: "Review Weekly Report",
    description: "V Shred weekly performance report ready for review",
    timestamp: new Date(now.getTime() - 30 * 60 * 1000),
    clientName: "V Shred",
    assignee: "Sarah",
    targetTab: "tasks",
  })

  items.push({
    id: "task-2",
    severity: "info",
    title: "Approve Draft Reply",
    description: "AI drafted response to Allbirds iOS tracking question",
    timestamp: new Date(now.getTime() - 60 * 60 * 1000),
    clientName: "Allbirds",
    assignee: "Luke",
    targetTab: "tasks",
  })

  // Add performance items
  items.push({
    id: "perf-1",
    severity: "critical",
    title: "Budget Cap Hit",
    description: "Beardbrand hit daily budget cap at 2PM. Campaigns paused.",
    timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    clientName: "Beardbrand",
    targetTab: "performance",
  })

  items.push({
    id: "perf-2",
    severity: "warning",
    title: "ROAS Dropped 10%",
    description: "Brooklinen ROAS decreased from 3.2 to 2.9 this week",
    timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    clientName: "Brooklinen",
    targetTab: "performance",
  })

  // Sort by timestamp (most recent first)
  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

// Client Progress Widget
function ClientProgressWidget({
  clients,
  onClientClick
}: {
  clients: Client[]
  onClientClick: (client: Client) => void
}) {
  const topClients = clients.slice(0, 5)

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Client Progress</h3>
      <div className="space-y-2">
        {topClients.map(client => {
          const progress = Math.floor(Math.random() * 40 + 60) // Mock progress
          const owner = owners.find(o => o.name === client.owner)
          return (
            <button
              key={client.id}
              onClick={() => onClientClick(client)}
              className="flex items-center gap-3 w-full hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors"
            >
              <div className="flex items-center gap-2 w-28 shrink-0">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white", owner?.color || "bg-gray-500")}>
                  {client.logo}
                </div>
                <span className="text-sm text-foreground truncate">{client.name}</span>
              </div>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-14 text-right">
                {client.tasks?.length || 0} tasks
              </span>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {progress}%
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Clients by Stage Widget
function ClientsByStageWidget({
  clients,
  onStageClick
}: {
  clients: Client[]
  onStageClick: (stage: string) => void
}) {
  const stageCount = clients.reduce((acc, client) => {
    acc[client.stage] = (acc[client.stage] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const stages = [
    { name: "Live", count: stageCount["Live"] || 0, color: "bg-emerald-500" },
    { name: "Installation", count: stageCount["Installation"] || 0, color: "bg-blue-500" },
    { name: "Onboarding", count: stageCount["Onboarding"] || 0, color: "bg-purple-500" },
    { name: "Audit", count: stageCount["Audit"] || 0, color: "bg-amber-500" },
    { name: "Needs Support", count: stageCount["Needs Support"] || 0, color: "bg-rose-500" },
  ]

  const total = clients.length

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Clients by Stage</h3>
      <div className="space-y-2">
        {stages.map(stage => (
          <button
            key={stage.name}
            onClick={() => onStageClick(stage.name)}
            className="flex items-center gap-3 w-full hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors"
          >
            <span className="text-sm text-muted-foreground w-24 shrink-0 text-left">{stage.name}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", stage.color)}
                style={{ width: `${total > 0 ? (stage.count / total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm text-foreground w-6 text-right">{stage.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Tasks by Assignee Widget
function TasksByAssigneeWidget({
  clients,
  onOwnerClick
}: {
  clients: Client[]
  onOwnerClick: (owner: string) => void
}) {
  const tasksByOwner = clients.reduce((acc, client) => {
    acc[client.owner] = (acc[client.owner] || 0) + (client.tasks?.length || 0)
    return acc
  }, {} as Record<string, number>)

  const totalTasks = Object.values(tasksByOwner).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Tasks by Assignee</h3>
      <div className="space-y-2">
        {Object.entries(tasksByOwner).slice(0, 4).map(([owner, count]) => {
          const ownerData = owners.find(o => o.name === owner)
          return (
            <button
              key={owner}
              onClick={() => onOwnerClick(owner)}
              className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors"
            >
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white", ownerData?.color || "bg-gray-500")}>
                {ownerData?.avatar || owner[0]}
              </div>
              <span className="text-xs text-muted-foreground w-14 truncate text-left">{owner.split(" ")[0]}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", ownerData?.color || "bg-gray-500")}
                  style={{ width: `${totalTasks > 0 ? (count / totalTasks) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-foreground w-6 text-right">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Load by Status Widget (compact square)
function LoadByStatusWidget({ clients }: { clients: Client[] }) {
  const healthCounts = clients.reduce((acc, client) => {
    acc[client.health] = (acc[client.health] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const total = clients.length
  const greenPercent = total > 0 ? Math.round(((healthCounts["Green"] || 0) / total) * 100) : 0
  const atRisk = (healthCounts["Red"] || 0) + (healthCounts["Yellow"] || 0) + (healthCounts["Blocked"] || 0)

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col">
      <h3 className="text-xs font-medium text-muted-foreground mb-2">Load by Status</h3>
      <div className="flex items-center gap-3 flex-1">
        <div className="flex gap-1">
          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">{healthCounts["Green"] || 0}/{total}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">{atRisk}/{total}</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden flex">
        <div className="h-full bg-emerald-500" style={{ width: `${greenPercent}%` }} />
        <div className="h-full bg-amber-500" style={{ width: `${total > 0 ? ((healthCounts["Yellow"] || 0) / total) * 100 : 0}%` }} />
        <div className="h-full bg-red-500" style={{ width: `${total > 0 ? ((healthCounts["Red"] || 0) / total) * 100 : 0}%` }} />
      </div>
    </div>
  )
}

// Latest Activity Widget (compact square)
function LatestActivityWidget({
  clients,
  onClientClick
}: {
  clients: Client[]
  onClientClick: (client: Client) => void
}) {
  // Show most recent stage changes (mock: clients with low days in stage)
  const recentActivity = clients
    .filter(c => c.daysInStage <= 3)
    .slice(0, 2)

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col">
      <h3 className="text-xs font-medium text-muted-foreground mb-2">Latest Activity</h3>
      <div className="space-y-2 flex-1">
        {recentActivity.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent activity</p>
        ) : (
          recentActivity.map(client => (
            <button
              key={client.id}
              onClick={() => onClientClick(client)}
              className="flex items-start gap-2 w-full text-left hover:bg-muted/50 rounded p-1 -mx-1 transition-colors"
            >
              <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px] mt-0.5">✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{client.name}</p>
                <p className="text-[10px] text-muted-foreground">Moved to <span className="text-primary">{client.stage}</span></p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// HGC Input Bar
function HGCInputBar() {
  return (
    <div className="border-t border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Ask about your clients..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <Send className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

export function DashboardView({ clients, onClientClick }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview")

  const firehoseItems = useMemo(() => generateMockFirehoseItems(clients), [clients])

  // KPI data
  const kpis: LinearKPIData[] = [
    {
      label: "total clients",
      value: clients.length,
      change: 12,
      changeLabel: "from last month",
      sparklineData: [28, 29, 30, 29, 31, 30, 32],
    },
    {
      label: "this month",
      value: "$58.5K",
      change: 8.2,
      changeLabel: "vs target",
      sparklineData: [45, 48, 52, 50, 55, 54, 58.5],
    },
    {
      label: "pending resolution",
      value: clients.filter(c => c.supportTickets > 0).length,
      change: -58,
      changeLabel: "from last week",
      sparklineData: [12, 10, 8, 7, 6, 5, 5],
    },
    {
      label: "average score",
      value: "94%",
      change: 6,
      changeLabel: "this quarter",
      sparklineData: [88, 89, 90, 91, 92, 93, 94],
    },
  ]

  const handleFirehoseItemClick = (item: FirehoseItemData) => {
    // Navigate to the correct tab
    const tabMap: Record<FirehoseTab, DashboardTab> = {
      tasks: "tasks",
      clients: "clients",
      alerts: "alerts",
      performance: "performance",
    }
    setActiveTab(tabMap[item.targetTab])
    // If client item, also select the client
    if (item.clientId) {
      const client = clients.find(c => c.id === item.clientId)
      if (client) onClientClick(client)
    }
  }

  const handleStageClick = (stage: string) => {
    setActiveTab("clients")
    // In real app, would set filter to stage
  }

  const handleOwnerClick = (owner: string) => {
    setActiveTab("tasks")
    // In real app, would set filter to owner
  }

  // Filter clients/items for each tab
  const alertClients = clients.filter(c => c.health === "Red" || c.health === "Blocked")
  const taskItems = firehoseItems.filter(item => item.targetTab === "tasks")
  const alertItems = firehoseItems.filter(item => item.targetTab === "alerts" || item.severity === "critical")
  const perfItems = firehoseItems.filter(item => item.targetTab === "performance")

  return (
    <div className="flex flex-col h-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        {kpis.map((kpi, i) => (
          <LinearKPICard key={i} data={kpi} />
        ))}
      </div>

      {/* Tabs */}
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden mt-3">
        {activeTab === "overview" ? (
          <div className="grid grid-cols-5 gap-3 h-full">
            {/* Left: Firehose Feed (40%) - scrolls independently */}
            <div className="col-span-2 h-full">
              <FirehoseFeed
                items={firehoseItems}
                onItemClick={handleFirehoseItemClick}
                className="h-full"
              />
            </div>

            {/* Right: Fixed Widgets (60%) */}
            <div className="col-span-3 flex flex-col gap-3">
              {/* Tasks by Assignee - top */}
              <TasksByAssigneeWidget clients={clients} onOwnerClick={handleOwnerClick} />

              {/* 2-column grid of square widgets */}
              <div className="grid grid-cols-2 gap-3">
                <LoadByStatusWidget clients={clients} />
                <LatestActivityWidget clients={clients} onClientClick={onClientClick} />
              </div>
            </div>
          </div>
        ) : activeTab === "tasks" ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground mb-3">Tasks ({taskItems.length})</h3>
            {taskItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending tasks</p>
            ) : (
              taskItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleFirehoseItemClick(item)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      item.severity === "critical" ? "bg-red-500" :
                      item.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    {item.assignee && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">@{item.assignee}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </button>
              ))
            )}
          </div>
        ) : activeTab === "clients" ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground mb-3">All Clients ({clients.length})</h3>
            {clients.map(client => {
              const owner = owners.find(o => o.name === client.owner)
              return (
                <button
                  key={client.id}
                  onClick={() => onClientClick(client)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm text-white", owner?.color || "bg-gray-500")}>
                      {client.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">{client.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{client.stage}</span>
                        <span>•</span>
                        <span className={cn(
                          client.health === "Red" ? "text-red-500" :
                          client.health === "Yellow" ? "text-amber-500" :
                          client.health === "Blocked" ? "text-purple-500" : "text-emerald-500"
                        )}>{client.health}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{client.daysInStage}d</span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : activeTab === "alerts" ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground mb-3">Alerts ({alertItems.length})</h3>
            {alertItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active alerts</p>
            ) : (
              alertItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleFirehoseItemClick(item)}
                  className="w-full text-left bg-card border border-red-500/30 rounded-lg p-3 hover:border-red-500/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    {item.clientName && (
                      <span className="text-xs bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">{item.clientName}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </button>
              ))
            )}
          </div>
        ) : activeTab === "performance" ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground mb-3">Performance ({perfItems.length})</h3>
            {perfItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No performance alerts</p>
            ) : (
              perfItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleFirehoseItemClick(item)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      item.severity === "critical" ? "bg-red-500" :
                      item.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    {item.clientName && (
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{item.clientName}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {/* HGC Input Bar */}
      <HGCInputBar />
    </div>
  )
}
