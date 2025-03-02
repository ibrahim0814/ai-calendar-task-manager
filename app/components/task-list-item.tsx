"use client"

import { Task } from "../../lib/types"

export default function TaskListItem({ task }: { task: Task }) {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
      <div className="flex justify-between items-start">
        <h3 className="font-medium">{task.title}</h3>
        <span className="px-2 py-1 text-xs bg-blue-900/30 text-blue-300 rounded">
          {task.priority || "Medium"}
        </span>
      </div>
      
      {task.description && (
        <p className="mt-1 text-sm text-slate-300">{task.description}</p>
      )}
      
      <div className="mt-3 flex justify-between text-xs text-slate-400">
        <div>
          {task.startTime && (
            <span>{formatDate(task.startTime)}</span>
          )}
          {task.endTime && task.startTime && (
            <span> - {formatDate(task.endTime)}</span>
          )}
        </div>
        
        {task.category && (
          <span className="bg-slate-700 px-2 py-1 rounded">
            {task.category}
          </span>
        )}
      </div>
    </div>
  )
}
