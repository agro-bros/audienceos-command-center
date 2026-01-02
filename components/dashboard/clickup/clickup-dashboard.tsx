"use client"

import { TaskStatusCards } from "./task-status-cards"
import { TaskCharts } from "./task-charts"
import { TaskActivity } from "./task-activity"
import { NavigationTabs } from "./navigation-tabs"
import { ActionBar } from "./action-bar"

interface ClickUpDashboardProps {
  // Optional props for customization
  onTabChange?: (tab: string) => void
  onAddCard?: () => void
}

export function ClickUpDashboard({ onTabChange, onAddCard }: ClickUpDashboardProps) {
  return (
    <div className="space-y-6">
      <NavigationTabs onTabChange={onTabChange} onAddCard={onAddCard} />
      <ActionBar />
      <TaskStatusCards />
      <TaskCharts />
      <TaskActivity />
    </div>
  )
}
