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
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold">{task.title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {task.description && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-400">Description</h3>
              <p className="text-slate-200 break-words">{task.description}</p>
            </div>
          )}
          
          <div className="grid gap-4 py-2">
            {/* Date and time section */}
            <div className="flex flex-col space-y-4 bg-slate-900/50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <span className="text-white">
                  {task.startTime 
                    ? format(new Date(task.startTime), "EEEE, MMMM d, yyyy") 
                    : "No date specified"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <span className="text-white">
                  {task.startTime 
                    ? format(new Date(task.startTime), "h:mm a") 
                    : "No time specified"}
                  {task.endTime && ` - ${format(new Date(task.endTime), "h:mm a")}`}
                </span>
              </div>
              {task.priority && (
                <div className="flex items-center space-x-2">
                  <Flag className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <div className={`capitalize ${getPriorityColor(task.priority)} font-medium`}>{task.priority} priority</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2 mt-2">
          {/* Mobile order: Delete first, then Edit */}
          <div className="flex flex-col sm:hidden w-full gap-2">
            <Button 
              variant="destructive" 
              className="justify-center items-center gap-2 h-11"
              onClick={onDelete}
            >
              <Trash className="h-4 w-4" />
              Delete Task
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-center items-center gap-2 h-11"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
              Edit Task
            </Button>
          </div>
          
          {/* Desktop order: Edit first, then Delete */}
          <div className="hidden sm:flex sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="flex-auto justify-center items-center gap-2 h-10"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
              Edit Task
            </Button>
            
            <Button 
              variant="destructive" 
              className="flex-auto justify-center items-center gap-2 h-10"
              onClick={onDelete}
            >
              <Trash className="h-4 w-4" />
              Delete Task
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
