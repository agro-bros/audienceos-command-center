"use client"

import { MoreHorizontal } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface StatusCardProps {
  title: string
  value: number
  subtitle: string
}

function StatusCard({ title, value, subtitle }: StatusCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-4xl font-bold text-foreground mb-1">{value}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  )
}

interface TaskCompletedByUser {
  count: number
  name: string
  initials: string
  color: string
}

interface TaskStatusCardsProps {
  unassigned?: number
  inProgress?: number
  completed?: number
  completedByUser?: TaskCompletedByUser[]
}

export function TaskStatusCards({
  unassigned = 14,
  inProgress = 2,
  completed = 8,
  completedByUser = [
    { count: 5, name: "Unassigned", initials: "U", color: "bg-emerald-500" },
    { count: 3, name: "Alex Smith", initials: "AS", color: "bg-blue-500" },
    { count: 1, name: "John Doe", initials: "JD", color: "bg-purple-500" },
  ],
}: TaskStatusCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatusCard title="Unassigned" value={unassigned} subtitle="tasks" />
      <StatusCard title="In Progress" value={inProgress} subtitle="tasks in progress" />
      <StatusCard title="Completed" value={completed} subtitle="tasks completed" />

      {/* Tasks Completed By User Card */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Tasks Completed...</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium text-foreground mb-3">Tasks</div>
          <div className="space-y-2">
            {completedByUser.map((user, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-6 h-6 ${user.color} rounded-full flex items-center justify-center text-white text-xs font-medium`}>
                  {user.count}
                </div>
                {user.name !== "Unassigned" && (
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm text-muted-foreground truncate">{user.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
