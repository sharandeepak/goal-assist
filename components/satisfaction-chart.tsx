"use client"

import { useState, useEffect } from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { SatisfactionLog } from "@/types"
import { subscribeToSatisfactionLogs } from "@/services/satisfactionService"
import { format } from "date-fns"

interface ChartData {
  day: string
  satisfaction: number
}

export default function SatisfactionChart() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsubscribe = subscribeToSatisfactionLogs(
      (fetchedLogs) => {
        // Format data for the chart (sort ascending for the chart line)
        const formattedData = fetchedLogs
          .sort((a, b) => a.date.toMillis() - b.date.toMillis()) // Sort chronologically
          .map((log) => ({
            day: format(log.date.toDate(), "E"), // Format date to 'Mon', 'Tue', etc.
            satisfaction: log.score,
          }))

        setChartData(formattedData)
        setLoading(false)
      },
      (err) => {
        console.error(err) // Service logs the error
        setError("Failed to load satisfaction data.")
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="h-[100px] mt-4">
        <Skeleton className="w-full h-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[100px] mt-4 flex items-center justify-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[100px] mt-4 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No satisfaction data available.</p>
      </div>
    )
  }

  return (
    <div className="h-[100px] mt-4">
      <ChartContainer
        config={{
          satisfaction: {
            label: "Satisfaction",
            color: "hsl(var(--chart-1))",
          },
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="satisfaction"
              stroke="hsl(var(--chart-1))" // Use variable directly
              strokeWidth={2}
              dot={false} // Simplified look
              activeDot={{
                r: 6,
                style: { fill: "hsl(var(--chart-1))", opacity: 0.9 },
              }}
            />
            <Tooltip
              cursor={false} // Hide cursor line for cleaner look
              content={<ChartTooltipContent indicator="line" hideLabel />} // Use indicator, hide default label
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

