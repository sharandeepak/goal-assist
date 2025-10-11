"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, AlertCircle, Clock, Loader2, ListChecks, NotebookPen, Save, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { StandupLog, Task } from "@/types"
import { subscribeToRecentStandups } from "@/services/standupService"
import { formatRelative, format, subDays, startOfDay, endOfDay } from "date-fns"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Timestamp, collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Helper to format relative date
const formatRelativeDate = (date: Date) => {
    const relative = formatRelative(date, new Date());
    // Capitalize first letter and handle cases like "today", "yesterday"
    return relative.charAt(0).toUpperCase() + relative.slice(1).split(" at")[0];
};

export default function StandupSummary() {
  const [standupLogs, setStandupLogs] = useState<StandupLog[]>([])
  const [loadingStandups, setLoadingStandups] = useState(true)
  const [errorStandups, setErrorStandups] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("")

  // State for Completed Tasks
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [errorTasks, setErrorTasks] = useState<string | null>(null)

  // State for Quick Notes
  const [quickNote, setQuickNote] = useState<string>("")
  const [isSavingNote, setIsSavingNote] = useState(false)

  // Effect for Standups
  useEffect(() => {
    setLoadingStandups(true)
    setErrorStandups(null)

    const unsubscribe = subscribeToRecentStandups(
        (fetchedLogs) => {
            setStandupLogs(fetchedLogs)
            if (fetchedLogs.length > 0 && (!activeTab || !fetchedLogs.some(log => log.id === activeTab))) {
                setActiveTab(fetchedLogs[0].id)
            }
            else if (fetchedLogs.length === 0) {
                 setActiveTab("");
            }
            setLoadingStandups(false)
        },
        (err) => {
            console.error(err)
            setErrorStandups("Failed to load standup summaries.")
            setLoadingStandups(false)
        }
    )
    return () => unsubscribe()
  }, []) // Standup effect runs once

  // Effect for Completed Tasks (runs once)
  useEffect(() => {
    const fetchCompletedTasks = async () => {
        setLoadingTasks(true);
        setErrorTasks(null);
        try {
            const today = new Date();
            const twoDaysAgo = startOfDay(subDays(today, 1)); // Start of yesterday
            const now = endOfDay(today); // End of today

            // Query Firestore directly for tasks completed yesterday or today
            const tasksRef = collection(db, "tasks");
            const q = query(
                tasksRef,
                where("completed", "==", true),
                where("date", ">=", Timestamp.fromDate(twoDaysAgo)),
                where("date", "<=", Timestamp.fromDate(now)),
                orderBy("date", "desc") // Show most recent completed first
            );

            const querySnapshot = await getDocs(q);
            const fetchedTasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setCompletedTasks(fetchedTasks);
        } catch (err) {
            console.error("Failed to fetch completed tasks:", err);
            setErrorTasks("Could not load completed tasks.");
        } finally {
            setLoadingTasks(false);
        }
    };
    fetchCompletedTasks();
  }, []); // Task effect runs once

  // Effect for Quick Notes (load on mount)
  useEffect(() => {
    const savedNote = localStorage.getItem("quickStandupNote");
    if (savedNote) {
        setQuickNote(savedNote);
    }
  }, []);

  // --- Handlers for Quick Notes ---
  const handleSaveNote = () => {
    setIsSavingNote(true);
    try {
        localStorage.setItem("quickStandupNote", quickNote);
        // Simulate save delay for visual feedback
        setTimeout(() => {
            setIsSavingNote(false);
        }, 500);
    } catch (error) {
        console.error("Failed to save note to local storage:", error);
        // Optionally show an error message to the user
        setIsSavingNote(false);
    }
  };

  const handleClearNote = () => {
    setQuickNote("");
    localStorage.removeItem("quickStandupNote");
  };


  // --- Render Logic ---

  const renderStandupContent = () => {
    if (loadingStandups) {
        return (
          <Tabs defaultValue="loading">
            <TabsList className="mb-4">
              <Skeleton className="h-10 w-24 mr-2" />
              <Skeleton className="h-10 w-24" />
            </TabsList>
            <TabsContent value="loading">
              <Card>
                <CardContent className="p-4 space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-5 w-1/4 mb-1" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )
    }
    if (errorStandups) {
      return <div className="text-center text-sm text-red-600 py-4">{errorStandups}</div>
    }
    if (standupLogs.length === 0) {
      return <div className="text-center text-sm text-muted-foreground py-4">No standup logs found for the last 2 days.</div>
    }
    // Actual Tabs rendering
    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2"> {/* Adjust grid cols if more logs */}
                {standupLogs.map((log) => (
                    <TabsTrigger key={log.id} value={log.id}>
                        {formatRelativeDate(log.date.toDate())}
                    </TabsTrigger>
                ))}
            </TabsList>
            {standupLogs.map((standup) => (
                <TabsContent key={standup.id} value={standup.id}>
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                {standup.completed.length > 0 && (
                                    <div>
                                      <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Completed
                                      </h3>
                                      <ul className="space-y-1 list-disc pl-6">
                                        {standup.completed.map((item, i) => (
                                          <li key={i} className="text-sm">
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                )}

                                {standup.blockers.length > 0 && (
                                    <div>
                                      <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                        Blockers
                                      </h3>
                                      <ul className="space-y-1 list-disc pl-6">
                                        {standup.blockers.map((item, i) => (
                                          <li key={i} className="text-sm">
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                )}

                                {standup.planned.length > 0 && (
                                    <div>
                                      <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                                        <Clock className="h-4 w-4 text-blue-500" />
                                        Planned
                                      </h3>
                                      <ul className="space-y-1 list-disc pl-6">
                                        {standup.planned.map((item, i) => (
                                          <li key={i} className="text-sm">
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                )}
                                {standup.completed.length === 0 && standup.blockers.length === 0 && standup.planned.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No details recorded for this day.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            ))}
        </Tabs>
    );
  }

  const renderCompletedTasks = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <ListChecks className="h-5 w-5" />
                    Completed Tasks (Last 2 Days)
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loadingTasks ? (
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                ) : errorTasks ? (
                    <p className="text-sm text-red-600">{errorTasks}</p>
                ) : completedTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks completed recently.</p>
                ) : (
                    <ul className="space-y-2">
                        {completedTasks.map(task => (
                             <li key={task.id} className="text-sm flex items-center gap-2 p-2 border rounded-md">
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span className="flex-grow">{task.title}</span>
                                <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                                    {task.date ? format(task.date.toDate(), "MMM d") : "Date N/A"}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
  }

   const renderQuickNotes = () => {
    return (
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-lg">
                    <NotebookPen className="h-5 w-5" />
                    Quick Notes
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea
                    placeholder="Jot down quick thoughts or reminders..."
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    rows={4}
                />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleClearNote} disabled={!quickNote}>
                    <Trash2 className="h-4 w-4 mr-1" /> Clear
                </Button>
                 <Button size="sm" onClick={handleSaveNote} disabled={isSavingNote || !quickNote}>
                    {isSavingNote ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    {isSavingNote ? "Saving..." : "Save"}
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Standups and Notes */}
      <div className="space-y-6">
        {renderCompletedTasks()}
      </div>
        {/* Column 2: Completed Tasks */}
        
      <div className="space-y-6">
        {/* {renderStandupContent()} */}
        {renderQuickNotes()}
      </div>
    </div>
  )
}

