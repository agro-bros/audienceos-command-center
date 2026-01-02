"use client"

import { Card, CardContent } from "@/components/ui/card"

interface MetricCardSparklineProps {
  title: string
  value: string
  subtitle: string
  trend: "up" | "down"
  trendValue: string
  sparklineData: { value: number }[]
  sparklineColor: string
}

export function MetricCardSparkline({
  title,
  value,
  subtitle,
  trend,
  trendValue,
}: MetricCardSparklineProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="text-right">
            <span className={`text-xs ${trend === "up" ? "text-emerald-500" : "text-red-500"}`}>
              {trendValue}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
