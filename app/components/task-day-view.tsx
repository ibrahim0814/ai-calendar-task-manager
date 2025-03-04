"use client";

import { useState, useRef, useCallback, memo, useEffect } from "react";
import { format, parse, setHours, setMinutes } from "date-fns";
import { TaskExtract } from "../../lib/types";
import { cn } from "../lib/utils";
import { useIsMobile } from "../hooks/use-mobile";
import { ChevronsUpDown } from "lucide-react";

interface TaskDayViewProps {
  tasks: TaskExtract[];
  updateTaskField: (
    index: number,
    field: keyof TaskExtract,
    value: any
  ) => void;
}

// Constants for time display
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES_INTERVAL = 30; // 30-minute intervals
const SLOT_HEIGHT = 30; // Height of each time slot in pixels

const TaskItem = memo(
  ({
    task,
    index,
    updateTaskField,
    moveTaskUp,
    moveTaskDown,
    onDragStart,
    isDragging,
  }: {
    task: TaskExtract;
    index: number;
    updateTaskField: (
      index: number,
      field: keyof TaskExtract,
      value: any
    ) => void;
    moveTaskUp: (index: number) => void;
    moveTaskDown: (index: number) => void;
    onDragStart: (index: number) => void;
    isDragging?: boolean;
  }) => {
    // Parse task time for positioning
    const taskTime = parse(task.startTime, "HH:mm", new Date());

    // Calculate position based on time
    const hour = taskTime.getHours();
    const minute = taskTime.getMinutes();
    const topPosition = ((hour * 60 + minute) / MINUTES_INTERVAL) * SLOT_HEIGHT;

    // Calculate height based on duration
    const heightPx = (task.duration / MINUTES_INTERVAL) * SLOT_HEIGHT;

    // Determine priority color class
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case "high":
          return "bg-red-500/20 border-red-500/50";
        case "medium":
          return "bg-amber-500/20 border-amber-500/50";
        case "low":
          return "bg-green-500/20 border-green-500/50";
        default:
          return "bg-slate-500/20 border-slate-500/50";
      }
    };

    // Handle moving task up 30 minutes
    const handleMoveUp = (e: React.MouseEvent) => {
      e.stopPropagation();
      moveTaskUp(index);
    };

    // Handle moving task down 30 minutes
    const handleMoveDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      moveTaskDown(index);
    };

    // Handle pointer down
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Set dragging state
      onDragStart(index);
    };

    // Handle drag start
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Set data transfer for drag
      if (e.dataTransfer) {
        e.dataTransfer.setData("text/plain", index.toString());
        e.dataTransfer.effectAllowed = "move";
      }
    };

    return (
      <div
        className={cn(
          "absolute left-12 right-0 rounded-md py-1 px-2 border group",
          "shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing",
          getPriorityColor(task.priority),
          isDragging ? "ring-2 ring-blue-500 z-50 shadow-lg" : ""
        )}
        style={{
          top: `${topPosition}px`,
          height: `${heightPx}px`,
          minHeight: "25px",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        onPointerDown={handlePointerDown}
        onDragStart={handleDragStart}
        draggable="true"
        data-task-item="true"
        data-task-index={index}
      >
        {/* Control buttons visible on hover */}
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="h-6 w-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
            onClick={handleMoveUp}
          >
            <ChevronsUpDown className="h-4 w-4 rotate-180" />
          </button>
          <button
            className="h-6 w-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
            onClick={handleMoveDown}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </div>

        {/* Task content */}
        <div className="px-2 flex justify-between items-start h-full">
          <div className="overflow-hidden">
            <h4 className="text-sm font-medium truncate">{task.title}</h4>
            {heightPx >= 50 && task.description && (
              <p className="text-xs text-slate-300 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <span className="text-xs whitespace-nowrap ml-2">
            {format(taskTime, "h:mm a")}
          </span>
        </div>
      </div>
    );
  }
);

TaskItem.displayName = "TaskItem";

const TimeSlot = memo(
  ({ hour, minute = 0 }: { hour: number; minute?: number }) => {
    const time = setMinutes(setHours(new Date(), hour), minute);
    const isHourStart = minute === 0;

    return (
      <div
        className={cn(
          "h-[30px] border-t border-slate-700 relative select-none",
          isHourStart ? "border-t-slate-600" : "border-t-slate-800"
        )}
        data-time-slot="true"
      >
        {isHourStart && (
          <span className="absolute -top-2.5 -left-12 text-xs text-slate-400 w-10 text-right select-none">
            {format(time, "h a")}
          </span>
        )}
      </div>
    );
  }
);

TimeSlot.displayName = "TimeSlot";

export default function TaskDayView({
  tasks,
  updateTaskField,
}: TaskDayViewProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragStartTime = useRef<string>("");
  const isMobile = useIsMobile();
  const isDragging = useRef<boolean>(false);
  const lastMoveTime = useRef<number>(0);
  const scrollInterval = useRef<number | null>(null);

  // Function to move a task up by 30 minutes
  const moveTaskUp = useCallback(
    (index: number) => {
      if (!tasks[index]) return;

      // Parse current start time
      const currentTime = parse(tasks[index].startTime, "HH:mm", new Date());

      // Calculate new time 30 minutes earlier
      const newMinutes = currentTime.getMinutes() - MINUTES_INTERVAL;
      let newHours = currentTime.getHours();

      // Handle hour change if minutes would be negative
      if (newMinutes < 0) {
        newHours = (newHours - 1 + 24) % 24; // Ensure hours wrap around (0-23)
        const adjustedMinutes = newMinutes + 60;

        // Format the new time as HH:mm
        const newTime = `${newHours
          .toString()
          .padStart(2, "0")}:${adjustedMinutes.toString().padStart(2, "0")}`;

        console.log(`Moving task ${index} up to ${newTime}`);
        updateTaskField(index, "startTime", newTime);
      } else {
        // Format the new time as HH:mm
        const newTime = `${newHours.toString().padStart(2, "0")}:${newMinutes
          .toString()
          .padStart(2, "0")}`;

        console.log(`Moving task ${index} up to ${newTime}`);
        updateTaskField(index, "startTime", newTime);
      }
    },
    [updateTaskField, tasks]
  );

  // Function to move a task down by 30 minutes
  const moveTaskDown = useCallback(
    (index: number) => {
      if (!tasks[index]) return;

      // Parse current start time
      const currentTime = parse(tasks[index].startTime, "HH:mm", new Date());

      // Calculate new time 30 minutes later
      const newMinutes = currentTime.getMinutes() + MINUTES_INTERVAL;
      let newHours = currentTime.getHours();

      // Handle hour change if minutes exceed 59
      if (newMinutes >= 60) {
        newHours = (newHours + 1) % 24; // Ensure hours wrap around (0-23)
        const adjustedMinutes = newMinutes - 60;

        // Format the new time as HH:mm
        const newTime = `${newHours
          .toString()
          .padStart(2, "0")}:${adjustedMinutes.toString().padStart(2, "0")}`;

        console.log(`Moving task ${index} down to ${newTime}`);
        updateTaskField(index, "startTime", newTime);
      } else {
        // Format the new time as HH:mm
        const newTime = `${newHours.toString().padStart(2, "0")}:${newMinutes
          .toString()
          .padStart(2, "0")}`;

        console.log(`Moving task ${index} down to ${newTime}`);
        updateTaskField(index, "startTime", newTime);
      }
    },
    [updateTaskField, tasks]
  );

  // Calculate new time based on position
  const calculateNewTime = useCallback(
    (clientY: number) => {
      if (draggingIndex === null || !containerRef.current) return null;

      // Get container position details
      const containerRect = containerRef.current.getBoundingClientRect();
      const timelineTop = containerRect.top + 2; // 2px for padding

      // Calculate cursor position relative to timeline
      const relativeY = Math.max(0, clientY - timelineTop);

      // Auto-scroll if near edges
      const scrollThreshold = 60; // pixels from edge to trigger scroll
      const scrollContainer = containerRef.current;

      if (clientY < containerRect.top + scrollThreshold) {
        // Scroll up more aggressively when near the top
        const distanceFromTop = clientY - containerRect.top;
        const scrollSpeed = Math.max(
          5,
          Math.round((scrollThreshold - distanceFromTop) / 2)
        );

        // Apply scroll - negative value scrolls up
        scrollContainer.scrollBy({
          top: -scrollSpeed,
          behavior: "auto",
        });
      } else if (clientY > containerRect.bottom - scrollThreshold) {
        // Scroll down when near the bottom
        const distanceFromBottom = containerRect.bottom - clientY;
        const scrollSpeed = Math.max(
          5,
          Math.round((scrollThreshold - distanceFromBottom) / 2)
        );

        // Apply scroll - positive value scrolls down
        scrollContainer.scrollBy({
          top: scrollSpeed,
          behavior: "auto",
        });
      }

      // Use the cursor position to determine time, accounting for scroll position
      const minutesFromTop =
        Math.floor((relativeY + scrollContainer.scrollTop) / SLOT_HEIGHT) *
        MINUTES_INTERVAL;

      // Calculate hours and minutes
      const hours = Math.floor(minutesFromTop / 60);
      const minutes = minutesFromTop % 60;

      // Ensure valid time values (0-23 hours, 0-59 minutes)
      const validHours = Math.min(23, Math.max(0, hours));
      const validMinutes = Math.min(59, Math.max(0, minutes));

      // Format as HH:MM
      return `${validHours.toString().padStart(2, "0")}:${validMinutes
        .toString()
        .padStart(2, "0")}`;
    },
    [draggingIndex]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (draggingIndex === null || !isDragging.current) return;

      // Throttle updates to every 16ms (roughly 60fps)
      const now = Date.now();
      if (now - lastMoveTime.current < 16) return;
      lastMoveTime.current = now;

      const newTimeString = calculateNewTime(e.clientY);
      if (newTimeString) {
        updateTaskField(draggingIndex, "startTime", newTimeString);
      }

      // Keep updating task position even when pointer isn't moving but we're near an edge
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        if (
          e.clientY < containerRect.top + 60 ||
          e.clientY > containerRect.bottom - 60
        ) {
          // Start continuous scrolling if not already started
          if (scrollInterval.current === null) {
            scrollInterval.current = window.setInterval(() => {
              const latestNewTimeString = calculateNewTime(e.clientY);
              if (latestNewTimeString) {
                updateTaskField(
                  draggingIndex,
                  "startTime",
                  latestNewTimeString
                );
              }
            }, 50);
          }
        } else {
          // Clear interval if we're not near an edge
          if (scrollInterval.current !== null) {
            window.clearInterval(scrollInterval.current);
            scrollInterval.current = null;
          }
        }
      }
    },
    [draggingIndex, updateTaskField, calculateNewTime]
  );

  // End dragging
  const endDrag = useCallback(() => {
    if (!isDragging.current) return;

    console.log(`Ending drag for task ${draggingIndex}`);

    setDraggingIndex(null);
    isDragging.current = false;

    // Clear any active scroll interval
    if (scrollInterval.current !== null) {
      window.clearInterval(scrollInterval.current);
      scrollInterval.current = null;
    }

    // Restore cursor and user select
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";

    // Re-enable pointer events on timeline elements
    if (timelineRef.current) {
      Array.from(
        timelineRef.current.querySelectorAll('[data-time-slot="true"]')
      ).forEach((elem) => {
        (elem as HTMLElement).style.pointerEvents = "auto";
      });
    }

    // Clear any browser text selection
    if (window.getSelection) {
      window.getSelection()?.empty();
    }
  }, [draggingIndex]);

  // Set up event listeners
  useEffect(() => {
    // Add event listeners
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);

    // Clean up event listeners
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", endDrag);
      document.removeEventListener("pointercancel", endDrag);
    };
  }, [handlePointerMove, endDrag]);

  // Generate time slots for the day view
  const timeSlots = [];
  for (const hour of HOURS) {
    timeSlots.push(<TimeSlot key={`${hour}:00`} hour={hour} />);
    timeSlots.push(<TimeSlot key={`${hour}:30`} hour={hour} minute={30} />);
  }

  // Render the day view component
  return (
    <div className="mt-4 border border-slate-700 rounded-md bg-slate-950 overflow-hidden">
      <div className="p-2 border-b border-slate-700 bg-slate-900">
        <h3 className="text-sm font-medium">Today's Schedule</h3>
        <p className="text-xs text-slate-400 mt-1">Drag tasks to reschedule</p>
      </div>

      <div
        className="p-2 relative h-[400px] overflow-y-auto scroll-smooth"
        ref={containerRef}
        style={{ touchAction: "pan-y" }}
      >
        <div className="relative" ref={timelineRef}>
          {/* Time column */}
          <div className="absolute left-0 top-0 bottom-0 w-12 border-r border-slate-700/30"></div>

          {/* Time slots */}
          <div className="ml-12">{timeSlots}</div>

          {/* Tasks */}
          {tasks.map((task, index) => (
            <TaskItem
              key={index}
              task={task}
              index={index}
              updateTaskField={updateTaskField}
              moveTaskUp={moveTaskUp}
              moveTaskDown={moveTaskDown}
              onDragStart={setDraggingIndex}
              isDragging={draggingIndex === index}
            />
          ))}

          {/* Visual indicator for dragging */}
          {draggingIndex !== null && (
            <div
              className="absolute left-12 right-0 h-[2px] bg-blue-500 pointer-events-none"
              style={{
                top: `${
                  ((parse(
                    tasks[draggingIndex].startTime,
                    "HH:mm",
                    new Date()
                  ).getHours() *
                    60 +
                    parse(
                      tasks[draggingIndex].startTime,
                      "HH:mm",
                      new Date()
                    ).getMinutes()) /
                    MINUTES_INTERVAL) *
                  SLOT_HEIGHT
                }px`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
