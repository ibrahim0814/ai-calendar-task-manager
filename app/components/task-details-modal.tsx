"use client"

import React from "react"
import { format } from "date-fns"
import { X, Edit, Trash, Calendar, Clock, Flag } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog"
import { Button } from "./ui/button"

interface Task {
  id: string
  title: string
  description?: string
  startTime: string
  endTime?: string
  priority?: "low" | "medium" | "high"
}

interface TaskDetailsModalProps {
  task: Task
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function TaskDetailsModal({ 
  task, 
  onClose, 
  onEdit, 
  onDelete 
}: TaskDetailsModalProps) {
  
  // Format date and time function
  const formatDateTime = (timeString: string) => {
    return format(new Date(timeString), "MMMM d, yyyy 'at' h:mm a")
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return "text-red-400"
      case 'medium':
        return "text-yellow-400"
      default:
        return "text-green-400"
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] w-[95vw]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl">{task.title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {task.description && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-400">Description</h3>
              <p className="text-slate-200">{task.description}</p>
            </div>
          )}
          
          <div className="grid gap-4 py-4">
            {/* Date and time section */}
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span>
                  {task.startTime 
                    ? format(new Date(task.startTime), "EEEE, MMMM d, yyyy") 
                    : "No date specified"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <span>
                  {task.startTime 
                    ? format(new Date(task.startTime), "h:mm a") 
                    : "No time specified"}
                  {task.endTime && ` - ${format(new Date(task.endTime), "h:mm a")}`}
                </span>
              </div>
              {task.priority && (
                <div className="flex items-center space-x-2">
                  <Flag className="h-5 w-5 text-gray-400" />
                  <div className="capitalize">{task.priority} priority</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-1"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          
          <Button 
            variant="destructive" 
            className="flex items-center gap-1"
            onClick={onDelete}
          >
            <Trash className="h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
