"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Target, Loader2, Plus } from "lucide-react"
import { Task, Milestone } from "@/types"
import { getTasksForDate, addTask } from "@/services/taskService"
import {
  getMilestonesEndingOnDate,
  getNextActiveMilestone,
} from "@/services/milestoneService"
import { format, startOfDay, endOfDay, differenceInCalendarDays, getDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Timestamp } from "firebase/firestore"
import { TaskFormDialog, TaskFormData } from "@/components/task-form-dialog"

// Helper function to calculate working days (Mon-Fri)
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0
  const currentDate = new Date(startDate)

  // Ensure we don't count the start date if it's the same as end date
  if (differenceInCalendarDays(endDate, startDate) <= 0) return 0

  while (currentDate < endDate) {
    const dayOfWeek = getDay(currentDate) // 0 = Sun, 6 = Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    currentDate.setDate(currentDate.getDate() + 1)
    // Ensure we compare date parts only, ignoring time
    if (startOfDay(currentDate).getTime() >= startOfDay(endDate).getTime()) {
        break
    }
  }
  return count
}

export default function SmartCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([])
  const [selectedDateMilestones, setSelectedDateMilestones] = useState<Milestone[]>([])
  const [workingDaysToNextMilestone, setWorkingDaysToNextMilestone] = useState<number | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  // State for the Add Task Dialog
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false)

  useEffect(() => {
    if (!date) {
      setSelectedDateTasks([])
      setSelectedDateMilestones([])
      setWorkingDaysToNextMilestone(null)
      setErrorDetails(null)
      return
    }

    const fetchDataForDate = async () => {
      setLoadingDetails(true)
      setErrorDetails(null)

      try {
        const [fetchedTasks, fetchedMilestones, nextMilestone] = await Promise.all([
          getTasksForDate(date),
          getMilestonesEndingOnDate(date),
          getNextActiveMilestone(date),
        ])

        setSelectedDateTasks(fetchedTasks)
        setSelectedDateMilestones(fetchedMilestones)

        if (nextMilestone && nextMilestone.endDate) {
          const days = calculateWorkingDays(date, nextMilestone.endDate.toDate())
          setWorkingDaysToNextMilestone(days)
        } else {
          setWorkingDaysToNextMilestone(null)
        }
      } catch (error) {
        console.error("Error fetching calendar data: ", error)
        setErrorDetails("Failed to load details for the selected date.")
        setSelectedDateTasks([])
        setSelectedDateMilestones([])
        setWorkingDaysToNextMilestone(null)
      } finally {
        setLoadingDetails(false)
      }
    }

    fetchDataForDate()
  }, [date])

  // --- Dialog Handlers ---
  const openAddTaskDialog = () => {
    if (!date) return
    setIsAddTaskDialogOpen(true)
  }

  const handleAddTaskSubmit = async (formData: TaskFormData) => {
    const dateToSave = formData.date || (date ? Timestamp.fromDate(startOfDay(date)) : Timestamp.now())

    const taskToAdd: Omit<Task, 'id'> = {
      title: formData.title!,
      completed: false,
      date: dateToSave,
      priority: formData.priority!,
      createdAt: Timestamp.now(),
      tags: formData.tagsString?.split(",").map((tag: string) => tag.trim()).filter((tag: string) => tag !== "") || [],
    }
    try {
      await addTask(taskToAdd)
      setIsAddTaskDialogOpen(false)
      if (date) {
        getTasksForDate(date).then(setSelectedDateTasks).catch(err => console.error("Error refetching tasks after add:", err))
      }
    } catch (err) {
      console.error("Failed to add task from calendar:", err)
      throw err instanceof Error ? err : new Error("Failed to add task.")
    }
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2 flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border p-0"
          />
        </div>
        <div className="md:w-1/2">
          {!date ? (
            <div className="flex items-center justify-center h-full p-4 border rounded-md">
              <p className="text-muted-foreground">Select a date to view details</p>
            </div>
          ) : loadingDetails ? (
            <Card>
              <CardContent className="p-4 space-y-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-5 w-1/2 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/4 mb-1" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="space-y-2 mt-4">
                  <Skeleton className="h-4 w-1/4 mb-1" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-9 w-full mt-6" />
              </CardContent>
            </Card>
          ) : errorDetails ? (
            <Card>
              <CardContent className="p-4 flex items-center justify-center">
                <p className="text-sm text-red-600">{errorDetails}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium mb-2">
                        {format(date, "EEEE, MMMM d")}
                      </h3>
                      <Badge variant="outline" className="bg-secondary">
                        {workingDaysToNextMilestone !== null
                          ? `${workingDaysToNextMilestone} working day${workingDaysToNextMilestone !== 1 ? 's' : ''} until next milestone`
                          : "No upcoming active milestones"}
                      </Badge>
                    </div>
                    {date && (
                      <Button onClick={openAddTaskDialog} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Task
                      </Button>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Tasks
                    </h4>
                    {selectedDateTasks.length > 0 ? (
                      <ul className="space-y-1">
                        {selectedDateTasks.map((task) => (
                          <li key={task.id} className="text-sm flex items-center gap-2">
                            <div
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.completed ? "bg-green-500" : "bg-yellow-500"}`}
                            />
                            <span className={task.completed ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No tasks scheduled for this day.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4" />
                      Milestones Due
                    </h4>
                    {selectedDateMilestones.length > 0 ? (
                      <ul className="space-y-1">
                        {selectedDateMilestones.map((milestone) => (
                          <li key={milestone.id} className="text-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <span>{milestone.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No milestones due on this day.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <TaskFormDialog
        isOpen={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
        onSubmit={handleAddTaskSubmit}
        initialData={date ? { date: Timestamp.fromDate(startOfDay(date)) } : null}
        dialogTitle={`Add Task for ${date ? format(date, "MMM d") : "Selected Date"}`}
        dialogDescription="Enter details for the new task. Priority is required."
      />
    </>
  )
}

