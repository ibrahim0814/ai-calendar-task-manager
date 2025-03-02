"use client"

import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"

export function TaskList() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await fetch("/api/tasks")
      if (!response.ok) throw new Error("Failed to fetch tasks")
      return response.json()
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!tasks?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks scheduled for today
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tasks.map((task: any) => (
        <Card key={task.id} className="p-4">
          <div className="font-medium">{task.title}</div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(task.scheduledStart), "h:mm a")} -{" "}
            {format(new Date(task.scheduledEnd), "h:mm a")}
          </div>
          {task.description && (
            <div className="mt-2 text-sm">{task.description}</div>
          )}
        </Card>
      ))}
    </div>
  )
}
