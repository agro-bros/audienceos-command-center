"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ProgressItem {
  id: string
  label: string
  value: number
  maxValue?: number
  color: string
  avatar?: { initials: string; color: string }
  sublabel?: string
}

interface ProgressListProps {
  title: string
  items: ProgressItem[]
  showPercentage?: boolean
  showValue?: boolean
  valueSuffix?: string
}

export function ProgressList({
  title,
  items,
  showPercentage,
  showValue,
  valueSuffix = "",
}: ProgressListProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {items.map((item) => {
          const percentage = item.maxValue ? (item.value / item.maxValue) * 100 : item.value
          return (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {item.avatar && (
                    <div className={`w-6 h-6 rounded ${item.avatar.color} flex items-center justify-center text-xs text-white`}>
                      {item.avatar.initials}
                    </div>
                  )}
                  <span className="text-foreground">{item.label}</span>
                  {item.sublabel && (
                    <span className="text-xs text-muted-foreground">({item.sublabel})</span>
                  )}
                </div>
                <span className="text-muted-foreground">
                  {showPercentage && `${Math.round(percentage)}%`}
                  {showValue && `${item.value}${valueSuffix}`}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
