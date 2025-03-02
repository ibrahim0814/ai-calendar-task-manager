"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { addHours } from "date-fns"

interface Task {
  id: string
  title: string
  description?: string
  startTime: string
  endTime?: string
  priority?: "low" | "medium" | "high"
}

interface TaskModalProps {
  onClose: () => void
  onCreateTask: (task: Omit<Task, 'id'>) => Promise<void>
  taskToEdit?: Task | null
}

export default function TaskModal({ onClose, onCreateTask, taskToEdit }: TaskModalProps) {
  const [title, setTitle] = useState(taskToEdit?.title || "")
  const [description, setDescription] = useState(taskToEdit?.description || "")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">(taskToEdit?.priority || "medium")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (taskToEdit) {
      // When editing a task, properly format the date-time values
      try {
        const startDate = new Date(taskToEdit.startTime);
        const formattedStartTime = startDate.toISOString().slice(0, 16);
        setStartTime(formattedStartTime);

        if (taskToEdit.endTime) {
          const endDate = new Date(taskToEdit.endTime);
          const formattedEndTime = endDate.toISOString().slice(0, 16);
          setEndTime(formattedEndTime);
        } else {
          // If no end time, default to start time + 1 hour
          const defaultEndDate = new Date(startDate);
          defaultEndDate.setHours(defaultEndDate.getHours() + 1);
          setEndTime(defaultEndDate.toISOString().slice(0, 16));
        }
      } catch (e) {
        console.error("Error parsing date:", e);
      }
    } else if (!startTime) {
      // Set default start time to current hour for new tasks
      const now = new Date();
      now.setMinutes(0);
      now.setSeconds(0);
      now.setMilliseconds(0);
      setStartTime(now.toISOString().slice(0, 16));
      
      // Set default end time to one hour later
      const oneHourLater = new Date(now);
      oneHourLater.setHours(now.getHours() + 1);
      setEndTime(oneHourLater.toISOString().slice(0, 16));
    }
  }, [taskToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError("Title is required")
      return
    }
    
    if (!startTime || !endTime) {
      setError("Start and end times are required")
      return
    }
    
    setIsSubmitting(true)
    setError("")
    
    try {
      await onCreateTask({
        title,
        description,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        priority,
        ...(taskToEdit ? { id: taskToEdit.id } : {})
      })
      onClose()
    } catch (err) {
      console.error("Error creating task:", err)
      setError("Failed to create task. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {taskToEdit 
              ? "Update your task details below." 
              : "Add a new task to your schedule."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about your task"
              className="resize-none"
            />
          </div>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={setPriority}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                Processing...
              </div>
            ) : (
              taskToEdit ? "Update" : "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
