"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, ChevronDown, Home, LineChart, Mic, Settings, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ModeToggle } from "./mode-toggle"

const routes = [
  {
    name: "Dashboard",
    path: "/",
    icon: Home,
  },
  {
    name: "Day Planner",
    path: "/planner",
    icon: ChevronDown,
  },
  {
    name: "Voice Log",
    path: "/voice-log",
    icon: Mic,
  },
  {
    name: "Milestones",
    path: "/milestones",
    icon: Target,
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: LineChart,
  },
  {
    name: "Calendar",
    path: "/calendar",
    icon: Calendar,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
  },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl flex items-center gap-2">
            <Target className="h-6 w-6" />
            <span>Goal Assist</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {routes.map((route) => (
              <Link
                key={route.path}
                href={route.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === route.path ? "text-primary" : "text-muted-foreground",
                )}
              >
                {route.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2"
            onClick={() => {
              // Trigger spotlight
              const event = new KeyboardEvent("keydown", {
                key: "k",
                ctrlKey: true,
              })
              document.dispatchEvent(event)
            }}
          >
            <span>Command</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <ModeToggle />

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <ChevronDown className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-4 mt-8">
                {routes.map((route) => (
                  <Link
                    key={route.path}
                    href={route.path}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary p-2 rounded-md",
                      pathname === route.path ? "bg-secondary text-primary" : "text-muted-foreground",
                    )}
                  >
                    <route.icon className="h-4 w-4" />
                    {route.name}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}

