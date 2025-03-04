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
    onDragStart,
    isDragging,
    isPlaceholderOnly,
  }: {
    task: TaskExtract;
    index: number;
    updateTaskField: (
      index: number,
      field: keyof TaskExtract,
      value: any
    ) => void;
    onDragStart: (index: number) => void;
    isDragging?: boolean;
    isPlaceholderOnly?: boolean;
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

    // If this is a placeholder only, render just the outline
    if (isPlaceholderOnly) {
      return (
        <div
          className="absolute left-12 right-0 border-2 border-dashed border-slate-600/30 rounded-md pointer-events-none"
          style={{
            top: `${topPosition}px`,
            height: `${heightPx}px`,
            minHeight: "25px",
            zIndex: 20,
          }}
          data-placeholder="true"
          data-task-index={index}
        />
      );
    }

    // Handle pointer down
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Set dragging state
      onDragStart(index);
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
        data-task-item="true"
        data-task-index={index}
      >
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
  // Clone the tasks to create immutable copies
  const [internalTasks, setInternalTasks] = useState<TaskExtract[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [draggingTask, setDraggingTask] = useState<TaskExtract | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const lastMoveTime = useRef<number>(0);
  const scrollInterval = useRef<number | null>(null);

  // Synchronize internal tasks with provided tasks when they change
  useEffect(() => {
    // Only update internal tasks when not dragging to prevent issues
    if (!isDragging.current) {
      setInternalTasks(JSON.parse(JSON.stringify(tasks)));
    }
  }, [tasks]);

  // Handle drag start
  const handleDragStart = useCallback(
    (index: number) => {
      console.log(`Starting drag for task ${index}`);

      // Create a deep clone of the task being dragged
      const taskToEdit = JSON.parse(JSON.stringify(internalTasks[index]));

      setDraggingIndex(index);
      setDraggingTask(taskToEdit);
      isDragging.current = true;

      // Disable pointer events on time slots to prevent interference
      if (timelineRef.current) {
        Array.from(
          timelineRef.current.querySelectorAll('[data-time-slot="true"]')
        ).forEach((elem) => {
          (elem as HTMLElement).style.pointerEvents = "none";
        });
      }

      // Set cursor for the entire document during drag
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
    },
    [internalTasks]
  );

  // Function to move a task up by 30 minutes
  const moveTaskUp = useCallback(
    (index: number) => {
      if (!internalTasks[index]) return;

      // Create a copy of the tasks
      const updatedTasks = [...internalTasks];
      const task = updatedTasks[index];

      // Parse current start time
      const currentTime = parse(task.startTime, "HH:mm", new Date());

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

        // Update internal state first
        updatedTasks[index] = {
          ...task,
          startTime: newTime,
        };
        setInternalTasks(updatedTasks);

        // Update parent state
        updateTaskField(index, "startTime", newTime);
      } else {
        // Format the new time as HH:mm
        const newTime = `${newHours.toString().padStart(2, "0")}:${newMinutes
          .toString()
          .padStart(2, "0")}`;

        // Update internal state first
        updatedTasks[index] = {
          ...task,
          startTime: newTime,
        };
        setInternalTasks(updatedTasks);

        // Update parent state
        updateTaskField(index, "startTime", newTime);
      }
    },
    [internalTasks, updateTaskField]
  );

  // Function to move a task down by 30 minutes
  const moveTaskDown = useCallback(
    (index: number) => {
      if (!internalTasks[index]) return;

      // Create a copy of the tasks
      const updatedTasks = [...internalTasks];
      const task = updatedTasks[index];

      // Parse current start time
      const currentTime = parse(task.startTime, "HH:mm", new Date());

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

        // Update internal state first
        updatedTasks[index] = {
          ...task,
          startTime: newTime,
        };
        setInternalTasks(updatedTasks);

        // Update parent state
        updateTaskField(index, "startTime", newTime);
      } else {
        // Format the new time as HH:mm
        const newTime = `${newHours.toString().padStart(2, "0")}:${newMinutes
          .toString()
          .padStart(2, "0")}`;

        // Update internal state first
        updatedTasks[index] = {
          ...task,
          startTime: newTime,
        };
        setInternalTasks(updatedTasks);

        // Update parent state
        updateTaskField(index, "startTime", newTime);
      }
    },
    [internalTasks, updateTaskField]
  );

  // Calculate new time based on position
  const calculateNewTime = useCallback(
    (clientY: number) => {
      if (draggingIndex === null || !containerRef.current) return null;

      // Get container position details
      const containerRect = containerRef.current.getBoundingClientRect();
      const timelineTop = containerRect.top + 2; // 2px for padding
      const scrollContainer = containerRef.current;

      // Calculate cursor position relative to timeline
      const relativeY =
        Math.max(0, clientY - timelineTop) + scrollContainer.scrollTop;

      // Auto-scroll if near edges (with reduced speed)
      const scrollThreshold = 80; // pixels from edge to trigger scroll

      if (clientY < containerRect.top + scrollThreshold) {
        // Scroll up with reduced speed
        const distanceFromTop = clientY - containerRect.top;
        const scrollSpeed = Math.max(
          2, // Slower minimum speed
          Math.round((scrollThreshold - distanceFromTop) / 5) // Reduced divisor for slower scrolling
        );

        // Apply scroll - negative value scrolls up
        scrollContainer.scrollBy({
          top: -scrollSpeed,
          behavior: "auto",
        });
      } else if (clientY > containerRect.bottom - scrollThreshold) {
        // Scroll down with reduced speed
        const distanceFromBottom = containerRect.bottom - clientY;
        const scrollSpeed = Math.max(
          2, // Slower minimum speed
          Math.round((scrollThreshold - distanceFromBottom) / 5) // Reduced divisor for slower scrolling
        );

        // Apply scroll - positive value scrolls down
        scrollContainer.scrollBy({
          top: scrollSpeed,
          behavior: "auto",
        });
      }

      const minutesFromTop =
        Math.floor(relativeY / SLOT_HEIGHT) * MINUTES_INTERVAL;

      const hours = Math.floor(minutesFromTop / 60);
      const minutes = minutesFromTop % 60;
      const validHours = Math.min(23, Math.max(0, hours));
      const validMinutes = Math.min(59, Math.max(0, minutes));

      return `${validHours.toString().padStart(2, "0")}:${validMinutes
        .toString()
        .padStart(2, "0")}`;
    },
    [draggingIndex]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (draggingIndex === null || !isDragging.current || !draggingTask)
        return;

      // Throttle updates to every 16ms (roughly 60fps)
      const now = Date.now();
      if (now - lastMoveTime.current < 16) return;
      lastMoveTime.current = now;

      const newTimeString = calculateNewTime(e.clientY);
      if (newTimeString) {
        // Update only the dragging task's copy
        setDraggingTask((prevTask) => {
          if (!prevTask) return null;
          return {
            ...prevTask,
            startTime: newTimeString,
          };
        });
      }

      // Keep updating task position even when pointer isn't moving but we're near an edge
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        // Use the larger threshold to match calculateNewTime
        const scrollThreshold = 80;

        if (
          e.clientY < containerRect.top + scrollThreshold ||
          e.clientY > containerRect.bottom - scrollThreshold
        ) {
          // Start continuous scrolling if not already started
          if (scrollInterval.current === null) {
            // Use a slower refresh rate of 100ms instead of 50ms to reduce visual jumping
            scrollInterval.current = window.setInterval(() => {
              // Calculate new time using the same function
              const latestNewTimeString = calculateNewTime(e.clientY);
              if (latestNewTimeString) {
                // Update only the dragging task's copy
                setDraggingTask((prevTask) => {
                  if (!prevTask) return null;
                  return {
                    ...prevTask,
                    startTime: latestNewTimeString,
                  };
                });
              }
            }, 100);
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
    [draggingIndex, draggingTask, calculateNewTime]
  );

  // End dragging
  const endDrag = useCallback(() => {
    if (!isDragging.current) return;

    console.log(`Ending drag for task ${draggingIndex}`);

    // Only now apply the changes to the parent state
    if (draggingIndex !== null && draggingTask) {
      updateTaskField(draggingIndex, "startTime", draggingTask.startTime);

      // Update our internal copy too
      setInternalTasks((prev) => {
        const updatedTasks = [...prev];
        updatedTasks[draggingIndex] = draggingTask;
        return updatedTasks;
      });
    }

    setDraggingIndex(null);
    setDraggingTask(null);
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
  }, [draggingIndex, draggingTask, updateTaskField]);

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

          {/* Non-dragging state: Display all tasks normally */}
          {!isDragging.current &&
            internalTasks.map((task, index) => (
              <TaskItem
                key={`normal-${index}`}
                task={task}
                index={index}
                updateTaskField={updateTaskField}
                onDragStart={handleDragStart}
                isDragging={false}
              />
            ))}

          {/* Dragging state: Display placeholders + dragging task */}
          {isDragging.current && draggingIndex !== null && (
            <>
              {/* Display placeholders for all tasks except the dragging one */}
              {internalTasks.map((task, index) =>
                index !== draggingIndex ? (
                  <TaskItem
                    key={`placeholder-${index}`}
                    task={task}
                    index={index}
                    updateTaskField={updateTaskField}
                    onDragStart={handleDragStart}
                    isPlaceholderOnly={true}
                  />
                ) : null
              )}

              {/* Display the dragging task */}
              {draggingTask && (
                <TaskItem
                  key={`dragging-${draggingIndex}`}
                  task={draggingTask}
                  index={draggingIndex}
                  updateTaskField={updateTaskField}
                  onDragStart={handleDragStart}
                  isDragging={true}
                />
              )}

              {/* Position indicator line */}
              {draggingTask && (
                <>
                  {/* Horizontal position indicator line */}
                  <div
                    className="absolute left-12 right-0 h-[2px] bg-blue-500 pointer-events-none"
                    style={{
                      top: `${
                        ((parse(
                          draggingTask.startTime,
                          "HH:mm",
                          new Date()
                        ).getHours() *
                          60 +
                          parse(
                            draggingTask.startTime,
                            "HH:mm",
                            new Date()
                          ).getMinutes()) /
                          MINUTES_INTERVAL) *
                        SLOT_HEIGHT
                      }px`,
                      zIndex: 60,
                    }}
                  />

                  {/* Time indicator */}
                  <div
                    className="absolute left-0 px-2 py-1 bg-blue-500 text-white text-xs rounded-sm font-medium pointer-events-none"
                    style={{
                      top: `${
                        ((parse(
                          draggingTask.startTime,
                          "HH:mm",
                          new Date()
                        ).getHours() *
                          60 +
                          parse(
                            draggingTask.startTime,
                            "HH:mm",
                            new Date()
                          ).getMinutes()) /
                          MINUTES_INTERVAL) *
                        SLOT_HEIGHT
                      }px`,
                      transform: "translateY(-50%)",
                      zIndex: 60,
                    }}
                  >
                    {format(
                      parse(draggingTask.startTime, "HH:mm", new Date()),
                      "h:mm a"
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
