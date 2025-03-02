"use client"

import { useState } from "react"
import { TaskInput } from "@/components/task-input"
import { TaskList } from "@/components/task-list"
import { CalendarView } from "@/components/calendar-view"
import { Button } from "@/components/ui/button"
import { Calendar, List } from "lucide-react"

export default function HomePage() {
  const [view, setView] = useState<"list" | "calendar">("calendar")

  return (
    <main className="container mx-auto p-4 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <TaskInput onTasksCreated={() => {}} />
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            size="sm"
            variant={view === "calendar" ? "default" : "outline"}
            onClick={() => setView("calendar")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
        </div>
        {view === "list" ? <TaskList /> : <CalendarView />}
      </div>
    </main>
  )
}