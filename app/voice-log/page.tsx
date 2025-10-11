"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, MicOff, Save, Trash2 } from "lucide-react"

export default function VoiceLog() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [editedTranscript, setEditedTranscript] = useState("")
  const [saveType, setSaveType] = useState("standup")
  const [logs, setLogs] = useState<
    Array<{
      id: number
      date: string
      content: string
      type: string
    }>
  >([
    {
      id: 1,
      date: new Date().toISOString(),
      content:
        "Completed the authentication flow and fixed responsive design issues. Blocked by waiting for API documentation from the backend team. Planning to complete unit tests and start work on the dashboard UI tomorrow.",
      type: "standup",
    },
    {
      id: 2,
      date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      content:
        "Created component library and set up CI/CD pipeline. No blockers today. Planning to implement authentication flow tomorrow.",
      type: "standup",
    },
  ])

  // Refs for animation
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  // Mock Web Speech API
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check if browser supports Web Speech API
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }

        setTranscript(finalTranscript || interimTranscript)
        setEditedTranscript(finalTranscript || interimTranscript)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Audio visualization
  useEffect(() => {
    if (!isRecording) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    const drawWaveform = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = "rgba(59, 130, 246, 0.5)"

      // Generate random waveform for demo
      const barWidth = 4
      const gap = 2
      const bars = Math.floor(width / (barWidth + gap))

      for (let i = 0; i < bars; i++) {
        const barHeight = Math.random() * height * 0.8
        ctx.fillRect(i * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight)
      }

      animationRef.current = requestAnimationFrame(drawWaveform)
    }

    drawWaveform()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRecording])

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsRecording(false)
    } else {
      setTranscript("")
      setEditedTranscript("")
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
      setIsRecording(true)
    }
  }

  const handleSave = () => {
    const newLog = {
      id: Math.max(...logs.map((log) => log.id), 0) + 1,
      date: new Date().toISOString(),
      content: editedTranscript,
      type: saveType,
    }

    setLogs([newLog, ...logs])
    setTranscript("")
    setEditedTranscript("")
    setSaveType("standup")
  }

  const handleDelete = (id: number) => {
    setLogs(logs.filter((log) => log.id !== id))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatLogContent = (content: string) => {
    // Convert to bullet points
    return content
      .split(". ")
      .map((sentence) => sentence.trim())
      .filter(Boolean)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Voice Log</h1>
        <p className="text-muted-foreground">Record your progress and thoughts with voice input</p>
      </div>

      <Card className={`${isRecording ? "border-primary" : ""}`}>
        <CardHeader>
          <CardTitle>Voice Recording</CardTitle>
          <CardDescription>Speak clearly to record your progress, blockers, or plans</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Button
              size="lg"
              className={`rounded-full w-16 h-16 ${isRecording ? "bg-red-500 hover:bg-red-600" : ""}`}
              onClick={toggleRecording}
            >
              {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              <span className="sr-only">{isRecording ? "Stop Recording" : "Start Recording"}</span>
            </Button>
          </div>

          {isRecording && (
            <div className="h-24 w-full">
              <canvas ref={canvasRef} width={800} height={100} className="w-full h-full" />
            </div>
          )}

          {transcript && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Transcript</h3>
                <Textarea
                  value={editedTranscript}
                  onChange={(e) => setEditedTranscript(e.target.value)}
                  className="min-h-[150px]"
                  placeholder="Edit your transcript here..."
                />
              </div>

              <div className="flex items-center gap-4">
                <Select value={saveType} onValueChange={setSaveType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Save as..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standup">Standup Note</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleSave} disabled={!editedTranscript.trim()}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Recent Logs</TabsTrigger>
          <TabsTrigger value="standups">Standups</TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="space-y-4">
          {logs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Mic className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
                <h3 className="font-medium text-lg">No logs yet</h3>
                <p className="text-sm text-muted-foreground">Start recording to create your first log</p>
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="task-card">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{formatDate(log.date)}</CardTitle>
                      <CardDescription>
                        Saved as: {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete log</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {formatLogContent(log.content).map((bullet, index) => (
                      <p key={index} className="text-sm">
                        • {bullet}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        <TabsContent value="standups" className="space-y-4">
          {logs.filter((log) => log.type === "standup").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Mic className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
                <h3 className="font-medium text-lg">No standup notes yet</h3>
                <p className="text-sm text-muted-foreground">Record your standup notes to see them here</p>
              </CardContent>
            </Card>
          ) : (
            logs
              .filter((log) => log.type === "standup")
              .map((log) => (
                <Card key={log.id} className="task-card">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{formatDate(log.date)}</CardTitle>
                        <CardDescription>Standup Note</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete log</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {formatLogContent(log.content).map((bullet, index) => (
                        <p key={index} className="text-sm">
                          • {bullet}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

