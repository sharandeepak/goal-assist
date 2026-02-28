"use client"

import { useState, useEffect } from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts"
import { styles } from "../styles/SatisfactionChart.styles"
import { ChartContainer, ChartTooltipContent } from "@/common/ui/chart"
import { Skeleton } from "@/common/ui/skeleton"
import { SatisfactionLog } from "@/common/types"
import { subscribeToSatisfactionLogs } from "@/features/satisfaction/services/satisfactionService"
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
          .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
          .map((log) => ({
            day: format(new Date(log.log_date), "E"),
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
      <div className={styles.container}>
        <Skeleton className={styles.skeleton} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.errorText}>{error}</p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.mutedText}>No satisfaction data available.</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
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

