"use client"

import { Calendar, dateFnsLocalizer } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import "react-big-calendar/lib/css/react-big-calendar.css"

const locales = {
  "en-US": require("date-fns/locale/en-US"),
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export function CalendarView() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await fetch("/api/tasks")
      if (!response.ok) throw new Error("Failed to fetch tasks")
      const data = await response.json()
      return data.map((event: any) => ({
        title: event.title,
        start: new Date(event.scheduledStart),
        end: new Date(event.scheduledEnd),
        description: event.description,
      }))
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-[600px] bg-background">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView="day"
        views={["day", "week"]}
        step={15}
        timeslots={4}
        className="rounded-lg shadow-sm"
      />
    </div>
  )
}
