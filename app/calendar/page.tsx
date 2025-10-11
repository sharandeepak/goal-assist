"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Target, AlertTriangle, Calendar as CalendarIcon, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Task, Milestone } from "@/types"
import { getTasksForDate, addTask } from "@/services/taskService"
import {
  getMilestonesEndingOnDate,
  getNextActiveMilestone,
  getUpcomingActiveMilestones,
} from "@/services/milestoneService"
import { format, startOfDay, endOfDay, differenceInCalendarDays, getDay, addDays } from "date-fns"
import { Timestamp, collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { TaskFormDialog, TaskFormData } from "@/components/task-form-dialog"

// Helper function to calculate working days (Mon-Fri)
// Could be moved to a utils file if used elsewhere
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0
  const currentDate = new Date(startDate)
  if (differenceInCalendarDays(endDate, startDate) <= 0) return 0
  while (currentDate < endDate) {
    const dayOfWeek = getDay(currentDate)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    currentDate.setDate(currentDate.getDate() + 1)
    if (startOfDay(currentDate).getTime() >= startOfDay(endDate).getTime()) {
        break
    }
  }
  return count
}

// Interface for upcoming deadlines combining tasks/milestones for display
interface UpcomingDeadline {
    date: Date;
    tasks: Task[];
    milestones: Milestone[];
}

export default function SmartCalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([])
  const [selectedDateMilestones, setSelectedDateMilestones] = useState<Milestone[]>([])
  const [workingDaysToNextMilestone, setWorkingDaysToNextMilestone] = useState<number | null>(null)
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for the Add Task Dialog
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false)

  // Fetch details for selected date
  useEffect(() => {
    if (!date) {
      setSelectedDateTasks([])
      setSelectedDateMilestones([])
      setWorkingDaysToNextMilestone(null)
      setError(null)
      return
    }

    const fetchDataForDate = async () => {
      setLoadingDetails(true)
      setError(null) // Clear previous errors related to date selection
      try {
        const [fetchedTasks, fetchedMilestones, nextMilestone] = await Promise.all([
          getTasksForDate(date),
          getMilestonesEndingOnDate(date),
          getNextActiveMilestone(date),
        ])
        setSelectedDateTasks(fetchedTasks)
        setSelectedDateMilestones(fetchedMilestones)
        if (nextMilestone?.endDate) {
          setWorkingDaysToNextMilestone(calculateWorkingDays(date, nextMilestone.endDate.toDate()))
        } else {
          setWorkingDaysToNextMilestone(null)
        }
      } catch (err) {
        console.error("Error fetching details for date:", err)
        setError("Failed to load details for the selected date.")
        setSelectedDateTasks([])
        setSelectedDateMilestones([])
        setWorkingDaysToNextMilestone(null)
      } finally {
        setLoadingDetails(false)
      }
    }
    fetchDataForDate()
  }, [date])

  // Fetch upcoming deadlines (run once on mount)
  useEffect(() => {
      const fetchUpcoming = async () => {
          setLoadingUpcoming(true);
           try {
                const today = new Date();
                const nextWeek = addDays(today, 7);

                // Fetch upcoming tasks using imported functions
                const tasksQuery = query(
                    collection(db, "tasks"),
                    where("date", ">=", Timestamp.fromDate(startOfDay(today))),
                    where("date", "<=", Timestamp.fromDate(endOfDay(nextWeek))),
                    orderBy("date", "asc")
                 );
                const upcomingTasksPromise = getDocs(tasksQuery);
                const upcomingMilestonesPromise = getUpcomingActiveMilestones(10);

                const [tasksSnapshot, upcomingMilestonesData] = await Promise.all([upcomingTasksPromise, upcomingMilestonesPromise]);

                // Add explicit type to doc
                const upcomingTasksData: Task[] = tasksSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Task));

                const combined: { [key: string]: UpcomingDeadline } = {};

                upcomingTasksData.forEach(task => {
                    if(task.date) {
                        const dateStr = format(task.date.toDate(), 'yyyy-MM-dd');
                        if (!combined[dateStr]) combined[dateStr] = { date: startOfDay(task.date.toDate()), tasks: [], milestones: [] };
                        combined[dateStr].tasks.push(task);
                    }
                });

                 // Add explicit type to milestone
                 upcomingMilestonesData.forEach((milestone: Milestone) => {
                    if(milestone.endDate) {
                        const dateStr = format(milestone.endDate.toDate(), 'yyyy-MM-dd');
                        if (!combined[dateStr]) combined[dateStr] = { date: startOfDay(milestone.endDate.toDate()), tasks: [], milestones: [] };
                        combined[dateStr].milestones.push(milestone);
                    }
                 });

                 const sortedUpcoming = Object.values(combined)
                                            .sort((a, b) => a.date.getTime() - b.date.getTime())
                                            .slice(0, 5);

                setUpcomingDeadlines(sortedUpcoming);
                setError(prev => prev === "Failed to load upcoming deadlines." ? null : prev);
           } catch (err) {
                console.error("Error fetching upcoming deadlines:", err);
                setError(prev => prev ? prev + " Failed to load upcoming deadlines." : "Failed to load upcoming deadlines.");
           } finally {
                setLoadingUpcoming(false);
           }
      }
      fetchUpcoming();
  }, []);

  // --- Dialog Handlers ---
  const openAddTaskDialog = () => {
    if (!date) return
    setIsAddTaskDialogOpen(true)
  }

  const handleAddTaskSubmit = async (formData: TaskFormData) => {
    if (!date) return // Ensure date is selected

    const dateToSave = formData.date || Timestamp.fromDate(startOfDay(date)) // Use selected date as default

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
      // Refetch tasks for the currently selected date to update the UI
      getTasksForDate(date).then(setSelectedDateTasks).catch(err => {
          console.error("Error refetching tasks after add:", err)
          setError("Failed to refresh tasks after adding.")
      })
    } catch (err) {
      console.error("Failed to add task from calendar page:", err)
      // Propagate the error to the dialog form
      throw err instanceof Error ? err : new Error("Failed to add task.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Smart Calendar</h1>
        <p className="text-muted-foreground">View your schedule, tasks, and milestones</p>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4 text-center text-destructive flex items-center justify-center gap-2">
                <AlertTriangle className="h-4 w-4"/> {error}
            </CardContent>
         </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Calendar Card */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Select a date to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              // Modifiers disabled for simplicity in this refactor
            />
          </CardContent>
        </Card>

        {/* Selected Date Details Card */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>
                {date
                  ? format(date, "EEEE, MMMM d, yyyy")
                  : "Select a date"}
              </CardTitle>
              <CardDescription>
                {date && workingDaysToNextMilestone !== null
                  ? `${workingDaysToNextMilestone} working day${workingDaysToNextMilestone !== 1 ? 's' : ''} until next milestone`
                  : date ? "No upcoming active milestones" : " "}
              </CardDescription>
            </div>
            {date && (
                <Button onClick={openAddTaskDialog} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
             )}
          </CardHeader>
          <CardContent>
            {loadingDetails ? (
                <div className="space-y-4 py-8">
                    <Skeleton className="h-5 w-1/4"/>
                    <Skeleton className="h-8 w-full"/>
                    <Skeleton className="h-5 w-1/4 mt-4"/>
                    <Skeleton className="h-8 w-full"/>
                </div>
            ) : !date ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
                <h3 className="font-medium text-lg">No date selected</h3>
                <p className="text-sm text-muted-foreground">Select a date to view details</p>
              </div>
            ) : selectedDateTasks.length === 0 && selectedDateMilestones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
                <h3 className="font-medium text-lg">No events</h3>
                <p className="text-sm text-muted-foreground">No tasks or milestones for this date</p>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedDateTasks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Tasks
                    </h3>
                    <div className="space-y-2">
                      {selectedDateTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-md border">
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${task.completed ? "bg-green-500" : "bg-yellow-500"}`}
                          />
                          <span className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDateMilestones.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Milestones Due
                    </h3>
                    <div className="space-y-2">
                      {selectedDateMilestones.map((milestone) => (
                        <div key={milestone.id} className="flex items-center gap-2 p-2 rounded-md border">
                          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                          <span className="text-sm">{milestone.title}</span>
                          <Badge
                            variant="outline"
                            className="ml-auto bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          >
                            Due
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
          <CardDescription>Next 5 days with tasks or milestone deadlines</CardDescription>
        </CardHeader>
        <CardContent>
            {loadingUpcoming ? (
                 <div className="space-y-4">
                     {[...Array(3)].map((_, i) => (
                         <div key={i} className="flex items-center gap-4 p-3">
                             <Skeleton className="h-16 w-16 rounded-md"/>
                             <div className="flex-1 space-y-2">
                                 <Skeleton className="h-5 w-1/4"/>
                                 <Skeleton className="h-4 w-3/4"/>
                             </div>
                         </div>
                     ))}
                 </div>
            ) : upcomingDeadlines.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
                    <h3 className="font-medium text-lg">No upcoming deadlines</h3>
                    <p className="text-sm text-muted-foreground">Looks like your schedule is clear.</p>
                 </div>
            ) : (
                <div className="space-y-4">
                    {upcomingDeadlines.map((event, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-md border task-card">
                    <div className="flex-shrink-0 w-16 h-16 flex flex-col items-center justify-center rounded-md bg-primary/10">
                        <span className="text-lg font-bold">{format(event.date, "d")}</span>
                        <span className="text-xs">{format(event.date, "MMM")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium">{format(event.date, "EEEE")}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                        {event.tasks.map((task) => (
                            <Badge key={task.id} variant="outline" className="bg-secondary text-xs">
                             <CheckCircle2 className="h-3 w-3 mr-1"/> {task.title}
                            </Badge>
                        ))}
                        {event.milestones.map((milestone) => (
                            <Badge
                            key={milestone.id}
                            variant="outline"
                            className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs"
                            >
                             <Target className="h-3 w-3 mr-1"/> {milestone.title}
                            </Badge>
                        ))}
                         {(event.tasks.length === 0 && event.milestones.length === 0) && (
                              <span className="text-xs text-muted-foreground">No specific items due</span>
                         )}
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            )}
        </CardContent>
      </Card>

      <TaskFormDialog
        isOpen={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
        onSubmit={handleAddTaskSubmit}
        initialData={date ? { date: Timestamp.fromDate(startOfDay(date)) } : null}
        dialogTitle={`Add Task for ${date ? format(date, "MMM d") : "Selected Date"}`}
        dialogDescription="Enter details for the new task. Priority is required."
      />
    </div>
  )
}

