"use client";

import { useState, useRef, useCallback, memo } from "react";
import { format, addMinutes, parse, isAfter, isBefore, setHours, setMinutes } from "date-fns";
import { TaskExtract } from "../../lib/types";
import { cn } from "../lib/utils";

interface TaskDayViewProps {
  tasks: TaskExtract[];
  updateTaskField: (index: number, field: keyof TaskExtract, value: any) => void;
}

// Generate time slots for the day
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES_INTERVAL = 30; // 30-minute intervals

const TaskItem = memo(({ 
  task, 
  index, 
  updateTaskField,
  startDrag,
  isDragging
}: { 
  task: TaskExtract; 
  index: number; 
  updateTaskField: (index: number, field: keyof TaskExtract, value: any) => void;
  startDrag: (e: React.MouseEvent, taskIndex: number) => void;
  isDragging?: boolean;
}) => {
  // Convert time string "HH:MM" to Date for positioning
  const taskTime = parse(task.startTime, "HH:mm", new Date());
  
  // Calculate position based on time
  const hour = taskTime.getHours();
  const minute = taskTime.getMinutes();
  const topPosition = (hour * 60 + minute) / MINUTES_INTERVAL * 30; // 30px per time slot
  
  // Calculate height based on duration (in minutes)
  const heightPx = (task.duration / MINUTES_INTERVAL) * 30;
  
  // Determine priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/20 border-red-500/50";
      case "medium": return "bg-amber-500/20 border-amber-500/50";
      case "low": return "bg-green-500/20 border-green-500/50";
      default: return "bg-slate-500/20 border-slate-500/50";
    }
  };

  return (
    <div
      className={cn(
        "absolute left-[60px] right-2 rounded-md px-2 py-1 border",
        "shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing",
        getPriorityColor(task.priority),
        isDragging ? "ring-2 ring-blue-500 opacity-80 z-10 shadow-lg" : ""
      )}
      style={{ 
        top: `${topPosition}px`, 
        height: `${heightPx}px`,
        minHeight: '25px'
      }}
      onMouseDown={(e) => startDrag(e, index)}
      draggable="true"
      onDragStart={(e) => {
        // Required to enable dragging but we're using our custom implementation
        e.dataTransfer.setData('text/plain', index.toString());
        // Hide the drag ghost image
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
        startDrag(e, index);
      }}
    >
      <div className="flex justify-between items-start h-full">
        <div className="overflow-hidden">
          <h4 className="text-sm font-medium truncate">{task.title}</h4>
          {heightPx >= 50 && task.description && (
            <p className="text-xs text-slate-300 line-clamp-2">{task.description}</p>
          )}
        </div>
        <span className="text-xs whitespace-nowrap">
          {format(taskTime, "h:mm a")}
        </span>
      </div>
    </div>
  );
});

TaskItem.displayName = "TaskItem";

const TimeSlot = memo(({ hour, minute = 0 }: { hour: number; minute?: number }) => {
  const time = setMinutes(setHours(new Date(), hour), minute);
  const isHourStart = minute === 0;
  
  return (
    <div className={cn(
      "h-[30px] border-t border-slate-700 relative",
      isHourStart ? "border-t-slate-600" : "border-t-slate-800"
    )}>
      {isHourStart && (
        <span className="absolute -top-2.5 -left-12 text-xs text-slate-400 w-10 text-right">
          {format(time, "h a")}
        </span>
      )}
    </div>
  );
});

TimeSlot.displayName = "TimeSlot";

export default function TaskDayView({ tasks, updateTaskField }: TaskDayViewProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartTime = useRef<string>("");
  
  // Start dragging a task
  const startDrag = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    
    // Set the dragging state
    setDraggingIndex(index);
    
    // Store initial values
    dragStartY.current = e.clientY;
    dragStartTime.current = tasks[index].startTime;
    
    // Add event listeners for drag movement and end
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    
    // Change cursor during drag
    document.body.style.cursor = 'grabbing';
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
  }, [tasks]);
  
  // Handle drag movement
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (draggingIndex === null || !containerRef.current) return;
    
    // Get container position details
    const containerRect = containerRef.current.getBoundingClientRect();
    const timelineTop = containerRect.top + 2; // 2px for padding
    
    // Calculate cursor position relative to timeline
    const relativeY = Math.max(0, e.clientY - timelineTop);
    
    // Auto-scroll if near edges
    const scrollThreshold = 40; // pixels from edge to trigger scroll
    const scrollContainer = containerRef.current;
    
    if (e.clientY < containerRect.top + scrollThreshold) {
      // Scroll up
      scrollContainer.scrollBy({
        top: -20,
        behavior: 'auto'
      });
    } else if (e.clientY > containerRect.bottom - scrollThreshold) {
      // Scroll down
      scrollContainer.scrollBy({
        top: 20,
        behavior: 'auto'
      });
    }
    
    // Convert Y position to minutes (30px = 30 minutes)
    // Account for scroll position when calculating time
    const minutesFromTop = Math.floor((relativeY + scrollContainer.scrollTop) / 30) * MINUTES_INTERVAL;
    
    // Calculate hours and minutes
    const hours = Math.floor(minutesFromTop / 60);
    const minutes = minutesFromTop % 60;
    
    // Ensure valid time values (0-23 hours, 0-59 minutes)
    const validHours = Math.min(23, Math.max(0, hours));
    const validMinutes = Math.min(59, Math.max(0, minutes));
    
    // Format as HH:MM
    const newTimeString = `${validHours.toString().padStart(2, '0')}:${validMinutes.toString().padStart(2, '0')}`;
    
    // Only update if the time has changed
    if (newTimeString !== tasks[draggingIndex].startTime) {
      console.log(`Moving task ${draggingIndex} to ${newTimeString}`);
      updateTaskField(draggingIndex, "startTime", newTimeString);
    }
  }, [draggingIndex, updateTaskField, tasks]);
  
  // End dragging
  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
    
    // Restore cursor
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Scroll container if task was moved near edges
    if (containerRef.current) {
      const taskElements = containerRef.current.querySelectorAll('[draggable="true"]');
      if (taskElements.length > 0) {
        taskElements[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [handleDragMove]);
  
  // Generate time slots for the day view
  const timeSlots = [];
  for (const hour of HOURS) {
    timeSlots.push(<TimeSlot key={`${hour}:00`} hour={hour} />);
    timeSlots.push(<TimeSlot key={`${hour}:30`} hour={hour} minute={30} />);
  }
  
  return (
    <div className="mt-4 border border-slate-700 rounded-md bg-slate-950 overflow-hidden">
      <div className="p-2 border-b border-slate-700 bg-slate-900">
        <h3 className="text-sm font-medium">Today's Schedule</h3>
        <p className="text-xs text-slate-400 mt-1">Drag tasks to reschedule</p>
      </div>
      
      <div className="p-2 relative h-[400px] overflow-y-auto scroll-smooth" ref={containerRef}>
        <div className="relative ml-12">
          {/* Time slots */}
          {timeSlots}
          
          {/* Tasks */}
          {tasks.map((task, index) => (
            <TaskItem
              key={index}
              task={task}
              index={index}
              updateTaskField={updateTaskField}
              startDrag={startDrag}
              isDragging={index === draggingIndex}
            />
          ))}
          
          {/* Visual indicator for dragging */}
          {draggingIndex !== null && (
            <div className="absolute left-0 right-0 h-[2px] bg-blue-500 pointer-events-none" 
              style={{ 
                top: `${((parse(tasks[draggingIndex].startTime, "HH:mm", new Date()).getHours() * 60) + 
                  parse(tasks[draggingIndex].startTime, "HH:mm", new Date()).getMinutes()) / MINUTES_INTERVAL * 30}px` 
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}