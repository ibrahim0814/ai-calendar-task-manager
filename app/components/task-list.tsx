"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Trash, Edit } from "lucide-react";
import { Task } from "@/lib/types";
import ConfirmationModal from "./confirmation-modal";

interface TaskListProps {
  tasks: Task[];
  onDeleteTask: (taskId: string) => Promise<void>;
  onEditTask: (taskId: string) => void;
  onViewTask: (taskId: string) => void;
  isLoading?: boolean;
}

export default function TaskList({
  tasks,
  onDeleteTask,
  onEditTask,
  onViewTask,
  isLoading,
}: TaskListProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Format time function
  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "No time set";
    return format(new Date(timeString), "h:mm a");
  };

  // Handle delete confirmation
  const confirmDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteConfirmation(true);
  };

  // Handle actual delete
  const handleDeleteConfirmed = async () => {
    if (!taskToDelete) return;

    setIsDeleting(true);
    try {
      await onDeleteTask(taskToDelete);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
      setTaskToDelete(null);
    }
  };

  // Function to determine if a task is current, past, or future based on current time
  const getCurrentTaskInfo = useMemo(() => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

    return tasks.map(task => {
      // Parse start and end times
      let startMinutes = 0;
      let endMinutes = 1440; // Default to end of day (24*60)
      
      if (task.startTime) {
        const startDate = new Date(task.startTime);
        startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
      }
      
      if (task.endTime) {
        const endDate = new Date(task.endTime);
        endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
      }

      // Determine task status
      let status: 'past' | 'current' | 'future' = 'future';
      if (currentTime >= endMinutes) {
        status = 'past';
      } else if (currentTime >= startMinutes && currentTime < endMinutes) {
        status = 'current';
      }

      // Calculate progress percentage for current tasks
      let progressPercent = 0;
      if (status === 'current' && startMinutes !== endMinutes) {
        progressPercent = Math.min(
          100,
          Math.round(((currentTime - startMinutes) / (endMinutes - startMinutes)) * 100)
        );
      } else if (status === 'past') {
        progressPercent = 100;
      }

      return {
        id: task.googleEventId || task.id || "",
        status,
        progressPercent
      };
    });
  }, [tasks]);

  return (
    <>
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-slate-400 p-8 text-center rounded-md empty-task-message">
            <div className="mb-2">📅</div>
            <div>No tasks scheduled for this day</div>
            <div className="text-sm mt-2 text-slate-500">
              Select a date with tasks or add a new one
            </div>
          </div>
        ) : (
          tasks.map((task, index) => {
            const taskInfo = getCurrentTaskInfo[index];
            const isCurrentTask = taskInfo.status === 'current';
            const isPastTask = taskInfo.status === 'past';
            const progressPercent = taskInfo.progressPercent;
            
            return (
              <div
                key={
                  task.googleEventId ||
                  `task-${Math.random().toString(36).substr(2, 9)}`
                }
                className={`bg-slate-800 p-3 rounded-lg border relative group hover:border-slate-600 transition-colors cursor-pointer ${
                  isCurrentTask 
                    ? "border-blue-500 ring-1 ring-blue-500" 
                    : "border-slate-700"
                } ${
                  !isCurrentTask ? "opacity-70" : "opacity-100" 
                }`}
                onClick={() => onViewTask(task.googleEventId || task.id || "")}
              >
                {/* Progress indicator for current task only */}
                {isCurrentTask && (
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-b-lg rounded-r-full" 
                    style={{ width: `${progressPercent}%`, zIndex: 1 }}
                  />
                )}
                
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`font-medium ${isCurrentTask ? "text-white" : "text-slate-300"}`}>
                      {task.title}
                    </h3>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatTime(task.startTime)} - {formatTime(task.endTime)}
                    </div>
                    <div className="mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          task.priority === "high"
                            ? "bg-red-900/30 text-red-400"
                            : task.priority === "medium"
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-green-900/30 text-green-400"
                        }`}
                      >
                        {task.priority && typeof task.priority === "string"
                          ? task.priority.charAt(0).toUpperCase() +
                            task.priority.slice(1)
                          : "Medium"}
                      </span>
                    </div>
                  </div>

                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        onEditTask(task.googleEventId || task.id || "")
                      }
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        confirmDeleteTask(task.googleEventId || task.id || "")
                      }
                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone and will remove the event from your Google Calendar."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteConfirmation(false)}
        isLoading={isDeleting}
      />
    </>
  );
}
