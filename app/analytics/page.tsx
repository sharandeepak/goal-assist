"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  BarChart,
  ResponsiveContainer,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

// Sample data for charts
const satisfactionData = [
  { date: "Apr 1", satisfaction: 7 },
  { date: "Apr 2", satisfaction: 6 },
  { date: "Apr 3", satisfaction: 8 },
  { date: "Apr 4", satisfaction: 7.5 },
  { date: "Apr 5", satisfaction: 9 },
  { date: "Apr 6", satisfaction: 8.5 },
  { date: "Apr 7", satisfaction: 7 },
  { date: "Apr 8", satisfaction: 6.5 },
  { date: "Apr 9", satisfaction: 7 },
  { date: "Apr 10", satisfaction: 8 },
  { date: "Apr 11", satisfaction: 8.5 },
  { date: "Apr 12", satisfaction: 9 },
  { date: "Apr 13", satisfaction: 8 },
  { date: "Apr 14", satisfaction: 7.5 },
]

const taskCompletionData = [
  { date: "Apr 1", completed: 5, total: 8 },
  { date: "Apr 2", completed: 4, total: 6 },
  { date: "Apr 3", completed: 7, total: 9 },
  { date: "Apr 4", completed: 6, total: 7 },
  { date: "Apr 5", completed: 8, total: 8 },
  { date: "Apr 6", completed: 5, total: 7 },
  { date: "Apr 7", completed: 4, total: 6 },
  { date: "Apr 8", completed: 6, total: 9 },
  { date: "Apr 9", completed: 7, total: 10 },
  { date: "Apr 10", completed: 8, total: 11 },
  { date: "Apr 11", completed: 9, total: 12 },
  { date: "Apr 12", completed: 7, total: 8 },
  { date: "Apr 13", completed: 6, total: 7 },
  { date: "Apr 14", completed: 5, total: 6 },
]

const progressData = [
  { week: "Week 1", progress: 25 },
  { week: "Week 2", progress: 40 },
  { week: "Week 3", progress: 65 },
  { week: "Week 4", progress: 80 },
]

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("14")

  // Filter data based on time range
  const filterData = (data: any[]) => {
    const days = Number.parseInt(timeRange)
    return data.slice(-days)
  }

  const filteredSatisfactionData = filterData(satisfactionData)
  const filteredTaskCompletionData = filterData(taskCompletionData)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Track your progress and satisfaction over time</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="satisfaction" className="space-y-4">
        <TabsList>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="tasks">Task Completion</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>
        <TabsContent value="satisfaction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Satisfaction</CardTitle>
              <CardDescription>Track your satisfaction levels on a scale of 1-10</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ChartContainer
                  config={{
                    satisfaction: {
                      label: "Satisfaction",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredSatisfactionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line type="monotone" dataKey="satisfaction" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Completion Rate</CardTitle>
              <CardDescription>Compare completed tasks vs. total tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ChartContainer
                  config={{
                    completed: {
                      label: "Completed",
                      color: "hsl(var(--chart-1))",
                    },
                    total: {
                      label: "Total",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredTaskCompletionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="completed" />
                      <Bar dataKey="total" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Progress</CardTitle>
              <CardDescription>Track your overall progress over weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ChartContainer
                  config={{
                    progress: {
                      label: "Progress",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="progress" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Average Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                filteredSatisfactionData.reduce((acc, item) => acc + item.satisfaction, 0) /
                filteredSatisfactionData.length
              ).toFixed(1)}
              /10
            </div>
            <p className="text-xs text-muted-foreground">Over the last {timeRange} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Task Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                (filteredTaskCompletionData.reduce((acc, item) => acc + item.completed, 0) /
                  filteredTaskCompletionData.reduce((acc, item) => acc + item.total, 0)) *
                  100,
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground">Over the last {timeRange} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData[progressData.length - 1].progress}%</div>
            <p className="text-xs text-muted-foreground">Overall project completion</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

