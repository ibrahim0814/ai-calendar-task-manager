"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Loader2,
  Clock,
  Calendar,
  CheckCircle,
  Edit as EditIcon,
  Check,
  Columns,
  ListTodo,
} from "lucide-react";
import { TaskExtract, Task } from "../../lib/types";
import { Badge } from "./ui/badge";
import {
  formatDuration,
  getTodayDateString,
  getTomorrowDateString,
  formatShortDate,
} from "../utils/date-utils";
import { isSameDay, addDays } from "date-fns";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Calendar as CalendarComponent } from "./ui/calendar";
import TaskDayView from "./task-day-view";
import { useIsMobile } from "../hooks/use-mobile";
import { TimePicker } from "./ui/time-picker";

interface NaturalLanguageModalProps {
  onClose: () => void;
  onCreateTasks: (tasks: TaskExtract[]) => Promise<void>;
  taskToEdit?: Task | null;
}

export default function NaturalLanguageModal({
  onClose,
  onCreateTasks,
  taskToEdit,
}: NaturalLanguageModalProps) {
  const isMobile = useIsMobile();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<TaskExtract[]>([]);
  const [processingStep, setProcessingStep] = useState<
    "input" | "confirmation"
  >("input");
  // Always default to list view
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // Start with no date selected
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Add effect for click-outside handling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      try {
        // Handle main date picker
        if (showDatePicker) {
          const datePickerElement = document.querySelector(
            '[data-date-picker="true"]'
          );
          if (
            datePickerElement &&
            !datePickerElement.contains(event.target as Node)
          ) {
            setShowDatePicker(false);
          }
        }

        // Handle task-specific date pickers
        let hasChanges = false;

        // Loop through all potential task indexes
        for (let i = 0; i < 20; i++) {
          // Assuming no more than 20 tasks
          const taskDatePickerKey = `taskDatePickerOpen-${i}`;

          // Check if this picker is open according to session storage
          if (sessionStorage.getItem(taskDatePickerKey) === "true") {
            // Get the element for this task's date picker
            const taskElement = document.querySelector(`.task-${i}-datepicker`);

            // If we found the element and the click was outside
            if (taskElement && !taskElement.contains(event.target as Node)) {
              console.log(`Closing date picker for task ${i}`);
              sessionStorage.removeItem(taskDatePickerKey);
              hasChanges = true;
            }
          }
        }

        // Only force re-render if we closed at least one date picker
        if (hasChanges) {
          // Force re-render to update UI
          console.log("Forcing re-render after closing date picker");
          setExtractedTasks((prev) => [...prev]);
        }
      } catch (error) {
        console.error("Error in click outside handler:", error);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDatePicker]);

  // No need to initialize date pickers anymore - using Popover component
  useEffect(() => {
    // This is now just a placeholder for any future task initialization logic
    if (!extractedTasks || !Array.isArray(extractedTasks)) {
      return;
    }
  }, [extractedTasks.length]);

  // Helper function to sort tasks by time
  const sortTasksByTime = useCallback((tasks: TaskExtract[]) => {
    try {
      // Ensure we're working with valid tasks
      if (!tasks || !Array.isArray(tasks)) {
        console.warn("Invalid tasks array passed to sortTasksByTime");
        return [];
      }

      return [...tasks].sort((a, b) => {
        try {
          // Ensure startTime properties exist and are valid strings
          const timeA =
            typeof a?.startTime === "string" ? a.startTime : "12:00";
          const timeB =
            typeof b?.startTime === "string" ? b.startTime : "12:00";

          // Ensure the time strings match the expected format
          const isValidTimeA = /^\d{1,2}:\d{2}$/.test(timeA);
          const isValidTimeB = /^\d{1,2}:\d{2}$/.test(timeB);

          if (!isValidTimeA || !isValidTimeB) {
            console.warn(
              `Invalid time format: ${!isValidTimeA ? timeA : timeB}`
            );
            return 0; // Don't change order if invalid format
          }

          // Parse hours and minutes safely
          let [hoursA, minutesA] = timeA.split(":").map(Number);
          let [hoursB, minutesB] = timeB.split(":").map(Number);

          // Validate parsed values
          hoursA = isNaN(hoursA) ? 12 : hoursA;
          minutesA = isNaN(minutesA) ? 0 : minutesA;
          hoursB = isNaN(hoursB) ? 12 : hoursB;
          minutesB = isNaN(minutesB) ? 0 : minutesB;

          // Compare hours
          if (hoursA !== hoursB) {
            return hoursA - hoursB;
          }

          // If hours are the same, compare minutes
          return minutesA - minutesB;
        } catch (error) {
          console.error("Error comparing tasks:", error);
          return 0; // Don't change order if error
        }
      });
    } catch (error) {
      console.error("Error sorting tasks:", error);
      return tasks || []; // Return original array if error
    }
  }, []);

  const handleExtractTasks = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!text.trim()) {
        setError("Please enter some text to create tasks");
        return;
      }

      console.log("Natural language task creation started with text:", text);
      setLoading(true);
      setError("");

      try {
        console.log("Calling /api/tasks/extract endpoint");
        const response = await fetch("/api/tasks/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        console.log("API response status:", response.status);

        if (!response.ok) {
          const data = await response.json();
          console.error("API error response:", data);
          throw new Error(data.error || "Failed to extract tasks");
        }

        const rawResponse = await response.text();
        console.log("Raw API response:", rawResponse);

        let tasks: TaskExtract[];
        try {
          tasks = JSON.parse(rawResponse);
          console.log("Successfully parsed tasks:", JSON.stringify(tasks));
        } catch (parseError) {
          console.error("Error parsing tasks JSON:", parseError);
          throw new Error("The response from the server was not valid JSON");
        }

        // Fix the tasks constant issue
        if (!tasks || tasks.length === 0) {
          const defaultTask = [
            {
              title: "Task from input",
              startTime: "12:00",
              duration: 30,
              priority: "medium" as const,
              date: new Date(),
            },
          ];
          setExtractedTasks(defaultTask);
          return;
        }

        // Set today as default date if none provided
        const today = new Date();
        setSelectedDate(today);

        try {
          // If tasks have a date, set the selectedDate to the first task's date
          if (tasks.length > 0 && tasks[0].date) {
            // Make sure we're using an actual Date object
            try {
              let taskDate;
              if (tasks[0].date instanceof Date) {
                taskDate = tasks[0].date;
              } else if (typeof tasks[0].date === "string") {
                taskDate = new Date(tasks[0].date);
              } else {
                taskDate = today;
              }

              // Verify the date is valid
              if (!isNaN(taskDate.getTime())) {
                console.log(
                  "Setting selected date from extracted task:",
                  taskDate.toISOString()
                );
                setSelectedDate(taskDate);
              }
            } catch (dateError) {
              console.error("Error processing task date:", dateError);
            }
          }
        } catch (dateSelectionError) {
          console.error("Error setting selected date:", dateSelectionError);
        }

        // Ensure all tasks have proper properties with error handling
        const processedTasks = tasks.map((task) => {
          try {
            let taskDate;
            if (task.date instanceof Date && !isNaN(task.date.getTime())) {
              taskDate = task.date;
            } else if (typeof task.date === "string") {
              try {
                const dateObj = new Date(task.date);
                taskDate = !isNaN(dateObj.getTime()) ? dateObj : undefined;
              } catch (e) {
                taskDate = undefined;
              }
            } else {
              taskDate = undefined;
            }

            // Ensure startTime is properly formatted (two digits, colon, two digits)
            let safeStartTime = "12:00";
            if (typeof task.startTime === "string") {
              // Validate or fix the time format
              if (/^\d{2}:\d{2}$/.test(task.startTime)) {
                safeStartTime = task.startTime;
              } else if (/^\d{1,2}:\d{2}$/.test(task.startTime)) {
                // Fix single-digit hour
                const [hours, minutes] = task.startTime.split(":");
                safeStartTime = `${hours.padStart(2, "0")}:${minutes}`;
                console.log(
                  `Fixing startTime format in client from ${task.startTime} to ${safeStartTime}`
                );
              } else {
                console.warn(
                  `Invalid startTime format: ${task.startTime}, using default 12:00`
                );
              }
            }

            return {
              ...task,
              date: taskDate,
              startTime: safeStartTime,
              duration: typeof task.duration === "number" ? task.duration : 30,
              priority:
                typeof task.priority === "string" ? task.priority : "medium",
            };
          } catch (taskError) {
            console.error("Error processing task:", taskError);
            // Return a safe default task if there's an error
            return {
              title: task.title || "Untitled Task",
              startTime: "12:00",
              duration: 30,
              priority: "medium" as const,
            };
          }
        });

        console.log(
          "Processed tasks with date objects:",
          JSON.stringify(processedTasks, (key, value) =>
            key === "date" && value ? value.toISOString() : value
          )
        );

        // Sort tasks by time when initially extracted
        const sortedTasks = sortTasksByTime(processedTasks);

        // Reset view mode to list (default)
        setViewMode("list");

        // Set tasks and move to confirmation step
        setExtractedTasks(sortedTasks);
        setProcessingStep("confirmation");
      } catch (err) {
        console.error("Error extracting tasks:", err);
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    },
    [text, sortTasksByTime]
  );

  const handleAddToCalendar = useCallback(async () => {
    if (!extractedTasks || extractedTasks.length === 0) {
      setError("No tasks to add");
      return;
    }

    console.log("Adding tasks to calendar:", JSON.stringify(extractedTasks));
    setIsAddingToCalendar(true);

    try {
      console.log("Calling onCreateTasks function");
      await onCreateTasks(extractedTasks);
      console.log("Tasks successfully added to calendar, closing modal");
    } catch (error) {
      console.error("Error adding tasks to calendar:", error);
      setError("Failed to add tasks to calendar");
    } finally {
      console.log("Setting isAddingToCalendar to false");
      setIsAddingToCalendar(false);
      onClose();
    }
  }, [extractedTasks, onClose, onCreateTasks]);

  const getPriorityColor = useCallback((priority: string | undefined) => {
    // Safely convert priority to lowercase if it exists and is a string
    const priorityLower =
      typeof priority === "string" ? priority.toLowerCase() : "";

    switch (priorityLower) {
      case "high":
        return "bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/50";
      case "medium":
        return "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/50";
      case "low":
        return "bg-green-500/20 text-green-200 hover:bg-green-500/30 border border-green-500/50";
      default:
        return "bg-slate-500/20 text-slate-200 hover:bg-slate-500/30 border border-slate-500/50";
    }
  }, []);

  const priorityOptions = useMemo(
    () => [
      {
        value: "high",
        label: "high",
        color:
          "bg-red-500/20 text-red-200 border border-red-500/50 hover:bg-red-500/30",
      },
      {
        value: "medium",
        label: "medium",
        color:
          "bg-amber-500/20 text-amber-200 border border-amber-500/50 hover:bg-amber-500/30",
      },
      {
        value: "low",
        label: "low",
        color:
          "bg-green-500/20 text-green-200 border border-green-500/50 hover:bg-green-500/30",
      },
    ],
    []
  );

  const updateTaskField = useCallback(
    (index: number, field: keyof TaskExtract, value: any) => {
      setExtractedTasks((prev) => {
        // Create a safe copy of the tasks array
        const updated = [...prev];

        // Special handling for date field
        if (field === "date") {
          try {
            // If value is a Date object, create a new Date object to avoid reference issues
            if (value instanceof Date) {
              console.log(
                `Setting date for task ${index} to:`,
                value.toISOString()
              );

              // Ensure the date is valid
              if (!isNaN(value.getTime())) {
                // Create a new task object with the updated date
                updated[index] = {
                  ...updated[index],
                  [field]: new Date(
                    value.getFullYear(),
                    value.getMonth(),
                    value.getDate()
                  ),
                };

                // Don't update the selectedDate for individual task updates
                // This was causing all tasks to appear with the same date

                console.log(
                  `Updated task ${index} with new date:`,
                  updated[index].date
                );
              } else {
                console.warn("Invalid Date object received:", value);
                // Keep existing value
                updated[index] = { ...updated[index] };
              }
            }
            // If value is a string, try to convert to Date
            else if (typeof value === "string") {
              console.log(`Converting string date for task ${index}:`, value);

              try {
                const dateObj = new Date(value);
                if (!isNaN(dateObj.getTime())) {
                  updated[index] = {
                    ...updated[index],
                    [field]: dateObj,
                  };

                  // Don't update the selectedDate for individual task updates
                  // This was causing all tasks to appear with the same date
                } else {
                  console.error("Invalid date string:", value);
                  // Keep existing value if string can't be parsed
                  updated[index] = { ...updated[index] };
                }
              } catch (parseError) {
                console.error("Date parsing error:", parseError);
                updated[index] = { ...updated[index] };
              }
            } else {
              // For any other value type, just create a copy of the task
              console.warn(
                `Unknown date value type for task ${index}:`,
                typeof value
              );
              updated[index] = {
                ...updated[index],
                [field]: value,
              };
            }
          } catch (error) {
            console.error("Error processing date:", error);
            // Keep existing data on error
            updated[index] = { ...updated[index] };
          }
        } else if (field === "startTime") {
          // For startTime field, validate time format
          try {
            if (typeof value === "string") {
              let timeValue = value;

              // Validate time format
              if (!/^\d{1,2}:\d{2}$/.test(timeValue)) {
                console.warn("Invalid time format for startTime:", timeValue);
                // Try to convert to HH:MM format
                const date = new Date(`2025-01-01T${timeValue}`);
                if (!isNaN(date.getTime())) {
                  const hours = date.getHours().toString().padStart(2, "0");
                  const minutes = date.getMinutes().toString().padStart(2, "0");
                  timeValue = `${hours}:${minutes}`;
                } else {
                  // Keep existing value
                  updated[index] = { ...updated[index] };
                  return updated;
                }
              }

              // Update with valid time value
              updated[index] = {
                ...updated[index],
                [field]: timeValue,
              };
            } else {
              // Keep existing value for non-string types
              updated[index] = { ...updated[index] };
            }
          } catch (error) {
            console.error("Error processing startTime:", error);
            // Keep existing data on error
            updated[index] = { ...updated[index] };
          }
        } else {
          // For other fields, update normally
          updated[index] = {
            ...updated[index],
            [field]: value,
          };
        }

        // Sort tasks by time if updating the startTime field
        if (field === "startTime") {
          console.log("Sorting tasks by updated start time");
          return sortTasksByTime(updated);
        }

        return updated;
      });
    },
    [sortTasksByTime]
  );

  // New dedicated function to update an individual task's date
  const updateIndividualTaskDate = useCallback((index: number, date: Date) => {
    if (!date || isNaN(date.getTime())) {
      console.warn("Attempted to update task with an invalid date");
      return;
    }

    console.log(`Updating date for task ${index} to:`, date.toISOString());

    setExtractedTasks((prevTasks) => {
      return prevTasks.map((task, i) => {
        if (i === index) {
          // Only update this specific task
          return {
            ...task,
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          };
        }
        return task;
      });
    });

    // Close the date picker for this task
    sessionStorage.removeItem(`taskDatePickerOpen-${index}`);
  }, []);

  const formatTimeForDisplay = useCallback((timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":");
      let hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12;
      hour = hour ? hour : 12; // Convert 0 to 12
      return `${hour}:${minutes} ${ampm}`;
    } catch (e) {
      return timeString;
    }
  }, []);

  // Input step rendering
  const renderInputStep = () => (
    <form onSubmit={handleExtractTasks}>
      <div className="grid gap-4 py-4">
        <Textarea
          placeholder=""
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[150px] resize-none"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleExtractTasks(e as unknown as React.FormEvent);
            }
          }}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
      <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
        {/* Mobile order: Submit first, then Cancel */}
        <div className="flex flex-col sm:hidden w-full gap-2">
          <Button type="submit" disabled={loading} className="h-11">
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </div>
            ) : (
              "Extract Tasks"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-11"
          >
            Cancel
          </Button>
        </div>

        {/* Desktop order: Cancel first, then Submit */}
        <div className="hidden sm:flex sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-10"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="h-10">
            {loading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </div>
            ) : (
              "Extract Tasks"
            )}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );

  // Task list rendering
  const renderTaskList = () => (
    <div
      className={`space-y-4 ${
        isMobile ? "max-h-[50vh]" : "max-h-[60vh] sm:max-h-[400px]"
      } overflow-y-auto mb-4`}
    >
      {extractedTasks.map((task, index) => (
        <div
          key={index}
          className="p-4 border border-slate-700 rounded-md shadow-sm bg-slate-900 text-white"
        >
          <div className="flex justify-between items-start mb-2">
            {editingTaskIndex === index ? (
              <div className="w-full">
                <Input
                  value={task.title}
                  onChange={(e) =>
                    updateTaskField(index, "title", e.target.value)
                  }
                  className="mb-2 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            ) : (
              <h3 className="font-medium text-lg text-white">{task.title}</h3>
            )}

            {editingTaskIndex === index ? (
              <div className="flex space-x-2 ml-2">
                <Select
                  value={task.priority}
                  onValueChange={(value) =>
                    updateTaskField(index, "priority", value)
                  }
                >
                  <SelectTrigger
                    className={`h-10 w-[100px] ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem
                      value="high"
                      className="bg-red-500/20 text-red-200 hover:bg-red-500/30 h-9"
                    >
                      High
                    </SelectItem>
                    <SelectItem
                      value="medium"
                      className="bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 h-9"
                    >
                      Medium
                    </SelectItem>
                    <SelectItem
                      value="low"
                      className="bg-green-500/20 text-green-200 hover:bg-green-500/30 h-9"
                    >
                      Low
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Badge
                className={`${getPriorityColor(
                  task.priority || "medium"
                )} cursor-pointer`}
                onClick={() => setEditingTaskIndex(index)}
              >
                {task.priority && typeof task.priority === "string"
                  ? task.priority.charAt(0).toUpperCase() +
                    task.priority.slice(1)
                  : "Medium"}
              </Badge>
            )}
          </div>

          {editingTaskIndex === index ? (
            <Textarea
              value={task.description || ""}
              onChange={(e) =>
                updateTaskField(index, "description", e.target.value)
              }
              placeholder="Add a description (optional)"
              className="mb-2 bg-slate-800 border-slate-700 text-white text-sm resize-none h-20"
            />
          ) : task.description ? (
            <p className="text-slate-300 mb-2 text-sm">{task.description}</p>
          ) : null}

          <div className="flex items-center text-sm text-slate-300 gap-3">
            {editingTaskIndex === index ? (
              <div className="flex items-center justify-between w-full gap-2 p-2 bg-slate-800/50 rounded-md">
                <div className="flex flex-wrap items-start gap-3 w-full">
                  <div className="flex items-center gap-3">
                    <div className={`relative task-${index}-datepicker`}>
                      {/* Use a simple button with state for toggling date picker */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 bg-slate-700 border-slate-600 text-white text-sm flex items-center gap-2"
                        onClick={() => {
                          // Create a temporary state variable for this task's showDatePicker
                          const taskIndexToToggle = `taskDatePickerOpen-${index}`;
                          const isCurrentlyOpen =
                            sessionStorage.getItem(taskIndexToToggle) ===
                            "true";

                          // Close all other date pickers
                          for (let i = 0; i < extractedTasks.length; i++) {
                            if (i !== index) {
                              sessionStorage.removeItem(
                                `taskDatePickerOpen-${i}`
                              );
                            }
                          }

                          // Toggle this one
                          if (isCurrentlyOpen) {
                            sessionStorage.removeItem(taskIndexToToggle);
                          } else {
                            sessionStorage.setItem(taskIndexToToggle, "true");
                          }

                          // Force re-render
                          setExtractedTasks([...extractedTasks]);

                          console.log(`Toggled date picker for task ${index}`);
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                        <span>
                          {task.date instanceof Date
                            ? formatShortDate(task.date)
                            : selectedDate instanceof Date
                            ? formatShortDate(selectedDate)
                            : "Today"}
                        </span>
                      </Button>

                      {/* Check session storage for this task's date picker state */}
                      {sessionStorage.getItem(`taskDatePickerOpen-${index}`) ===
                        "true" && (
                        <div className="absolute z-50 mt-1">
                          <div className="p-0 bg-slate-800 border border-slate-700 rounded-md shadow-lg">
                            <h3 className="px-3 py-2 border-b border-slate-700 text-sm font-medium text-white flex items-center justify-between">
                              <span>Select Date for Task</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full"
                                onClick={() => {
                                  sessionStorage.removeItem(
                                    `taskDatePickerOpen-${index}`
                                  );
                                  setExtractedTasks([...extractedTasks]);
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M18 6 6 18"></path>
                                  <path d="m6 6 12 12"></path>
                                </svg>
                              </Button>
                            </h3>
                            <CalendarComponent
                              mode="single"
                              selected={
                                task.date instanceof Date
                                  ? task.date
                                  : undefined
                              }
                              onSelect={(date) => {
                                if (!date) return;

                                console.log(
                                  `Calendar date selected:`,
                                  date.toISOString()
                                );
                                console.log(`For task index:`, index);

                                // Use the dedicated function for updating individual task dates
                                updateIndividualTaskDate(index, date);

                                // Force re-render with the new date (optional, as updateIndividualTaskDate already updates state)
                                requestAnimationFrame(() => {
                                  setExtractedTasks((currentTasks) => {
                                    return [...currentTasks];
                                  });
                                });
                              }}
                              className="text-white border-none p-2"
                              initialFocus
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <TimePicker
                        value={task.startTime}
                        onChange={(newTime) =>
                          updateTaskField(index, "startTime", newTime)
                        }
                        className="scale-90 origin-left"
                      />
                    </div>

                    <Select
                      value={task.duration.toString()}
                      onValueChange={(value) =>
                        updateTaskField(index, "duration", parseInt(value))
                      }
                    >
                      <SelectTrigger className="h-8 w-[100px] bg-slate-700 border-slate-600 text-white text-sm">
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {[15, 30, 45, 60, 90, 120, 180, 240].map((mins) => (
                          <SelectItem key={mins} value={mins.toString()}>
                            {mins} min
                            {mins > 60
                              ? ` (${Math.floor(mins / 60)}h${
                                  mins % 60 ? ` ${mins % 60}m` : ""
                                })`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="ml-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTaskIndex(null)}
                      className="h-7 w-7 p-0 rounded-full bg-blue-500/30 hover:bg-blue-500/40 text-blue-300 hover:text-blue-200"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="flex items-center cursor-pointer hover:text-white"
                  onClick={() => setEditingTaskIndex(index)}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTimeForDisplay(task.startTime)}
                </div>
                <div
                  className="flex items-center cursor-pointer hover:text-white"
                  onClick={() => setEditingTaskIndex(index)}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDuration(task.duration)}
                </div>

                {/* Blue date indicator - show task-specific date if available */}
                {task.date && !isSameDay(task.date, new Date()) ? (
                  <div className="flex items-center text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatShortDate(task.date)}
                  </div>
                ) : selectedDate && !isSameDay(selectedDate, new Date()) ? (
                  <div className="flex items-center text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatShortDate(selectedDate)}
                  </div>
                ) : null}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTaskIndex(index)}
                  className="h-6 w-6 p-0 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <EditIcon className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // Function to update the date for all tasks
  const updateAllTaskDates = useCallback((date: Date) => {
    if (!date) {
      console.warn("Attempted to update tasks with a null or undefined date");
      return;
    }

    try {
      // Create a clean date object without time component
      const cleanDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      console.log("Setting date for all tasks:", cleanDate.toISOString());

      setExtractedTasks((prevTasks) => {
        const newTasks = prevTasks.map((task) => {
          // Create a new Date object for each task to prevent reference issues
          return {
            ...task,
            date: new Date(cleanDate),
          };
        });

        console.log(
          "Updated tasks with new dates:",
          newTasks.map((t) => ({
            title: t.title,
            date: t.date ? t.date.toISOString() : null,
          }))
        );

        return newTasks;
      });

      // Set the selected date (for UI highlighting)
      setSelectedDate(cleanDate);
      console.log("Selected date updated to:", cleanDate.toISOString());

      // Close any open date pickers
      setShowDatePicker(false);

      // Clear session storage for all task date pickers
      for (let i = 0; i < 20; i++) {
        // Assuming no more than 20 tasks
        sessionStorage.removeItem(`taskDatePickerOpen-${i}`);
      }

      // Ensure a re-render occurs to reflect all the changes
      setTimeout(() => {
        setExtractedTasks((prev) => {
          return prev.map((task) => ({ ...task }));
        });
      }, 0);
    } catch (error) {
      console.error("Error updating task dates:", error);
    }
  }, []);

  // Mobile-specific confirmation step
  const renderMobileConfirmationStep = () => (
    <div className="py-2 flex flex-col">
      {/* Mobile date selector */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="text-sm font-medium mb-1">Schedule tasks for:</div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={
              selectedDate && isSameDay(selectedDate, new Date())
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => updateAllTaskDates(new Date())}
            className="text-xs h-9 w-full"
          >
            Today ({getTodayDateString()})
          </Button>
          <Button
            variant={
              selectedDate && isSameDay(selectedDate, addDays(new Date(), 1))
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => updateAllTaskDates(addDays(new Date(), 1))}
            className="text-xs h-9 w-full"
          >
            Tomorrow ({getTomorrowDateString()})
          </Button>
        </div>

        <div className="w-full flex items-center justify-center gap-1 h-9 text-xs">
          <Button
            variant={
              selectedDate &&
              !isSameDay(selectedDate, new Date()) &&
              !isSameDay(selectedDate, addDays(new Date(), 1))
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => {
              // Close any other open calendars first
              Object.keys(document.body.dataset)
                .filter((key) => key.startsWith("task-date-open-"))
                .forEach((key) => {
                  document.body.dataset[key] = "false";
                });

              // Toggle this calendar
              setShowDatePicker(!showDatePicker);
            }}
            className="w-full h-9 text-xs flex items-center justify-center gap-1"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {selectedDate &&
              !isSameDay(selectedDate, new Date()) &&
              !isSameDay(selectedDate, addDays(new Date(), 1))
                ? formatShortDate(selectedDate)
                : "Custom Date"}
            </span>
          </Button>
        </div>
      </div>

      {/* Mobile view toggle */}
      <div className="mb-3 w-full">
        <div className="grid grid-cols-2 gap-1 bg-slate-800 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 py-1 ${viewMode === "list" ? "bg-slate-700" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <ListTodo className="h-4 w-4 mr-2" />
            List View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 py-1 ${
              viewMode === "calendar" ? "bg-slate-700" : ""
            }`}
            onClick={() => setViewMode("calendar")}
          >
            <Columns className="h-4 w-4 mr-2" />
            Calendar View
          </Button>
        </div>
      </div>

      {/* Task display - calendar or list */}
      <div className="flex-1 overflow-y-auto max-h-[40vh]">
        {viewMode === "calendar" ? (
          <TaskDayView
            tasks={extractedTasks}
            updateTaskField={updateTaskField}
          />
        ) : (
          renderTaskList()
        )}
      </div>

      {/* Error message */}
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

      {/* Footer buttons */}
      <div className="mt-4 space-y-2">
        <Button
          type="button"
          onClick={handleAddToCalendar}
          disabled={loading || isAddingToCalendar}
          className="w-full h-11"
        >
          {isAddingToCalendar ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding to Calendar...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <CheckCircle className="mr-2 h-4 w-4" />
              Add to Calendar
            </div>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setProcessingStep("input")}
          disabled={loading}
          className="w-full h-11"
        >
          Back
        </Button>
      </div>
    </div>
  );

  // Desktop confirmation step rendering
  const renderDesktopConfirmationStep = () => (
    <div className="py-4 flex flex-col">
      {/* Date and view toggle buttons */}
      <div className="flex items-center justify-between mb-4">
        {/* Date selection buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Schedule for:</span>
          <Button
            variant={
              selectedDate && isSameDay(selectedDate, new Date())
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => {
              // Set to today
              updateAllTaskDates(new Date());
            }}
            className="text-xs h-8"
          >
            Today ({getTodayDateString()})
          </Button>
          <Button
            variant={
              selectedDate && isSameDay(selectedDate, addDays(new Date(), 1))
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => updateAllTaskDates(addDays(new Date(), 1))}
            className="text-xs h-8"
          >
            Tomorrow ({getTomorrowDateString()})
          </Button>
          <div className="relative" data-date-picker="true">
            <Button
              variant={
                selectedDate &&
                !isSameDay(selectedDate, new Date()) &&
                !isSameDay(selectedDate, addDays(new Date(), 1))
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => {
                // Close any other open calendars first
                Object.keys(document.body.dataset)
                  .filter((key) => key.startsWith("task-date-open-"))
                  .forEach((key) => {
                    document.body.dataset[key] = "false";
                  });
                // Toggle this calendar
                setShowDatePicker(!showDatePicker);
                // Force re-render
                setExtractedTasks([...extractedTasks]);
              }}
              className="h-8 text-xs flex items-center justify-center gap-1"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {selectedDate &&
                !isSameDay(selectedDate, new Date()) &&
                !isSameDay(selectedDate, addDays(new Date(), 1))
                  ? formatShortDate(selectedDate)
                  : "Custom Date"}
              </span>
            </Button>

            {showDatePicker && (
              <div className="absolute z-[9999] mt-1 left-0 w-auto min-w-[280px] bg-slate-800 border border-slate-700 rounded-md shadow-lg overflow-hidden">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={(date) => {
                    if (date) {
                      const newDate = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate()
                      );
                      updateAllTaskDates(newDate);
                      setShowDatePicker(false);
                    }
                  }}
                  className="border-none text-white"
                  initialFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* View toggle buttons */}
        <div className="bg-slate-800 rounded-lg p-1 flex">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${
              viewMode === "list" ? "bg-slate-700" : ""
            }`}
            onClick={() => setViewMode("list")}
            title="List View"
          >
            <ListTodo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${
              viewMode === "calendar" ? "bg-slate-700" : ""
            }`}
            onClick={() => setViewMode("calendar")}
            title="Calendar View"
          >
            <Columns className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Task display - calendar or list */}
      {viewMode === "calendar" ? (
        <TaskDayView tasks={extractedTasks} updateTaskField={updateTaskField} />
      ) : (
        renderTaskList()
      )}

      {/* Error message */}
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

      {/* Footer buttons */}
      <DialogFooter className="mt-2 flex flex-col sm:flex-row gap-2 sm:gap-2">
        {/* Mobile order: Primary action first, then Back */}
        <div className="flex flex-col sm:hidden w-full gap-2">
          <Button
            type="button"
            onClick={handleAddToCalendar}
            disabled={loading || isAddingToCalendar}
            className="h-11"
          >
            {isAddingToCalendar ? (
              <div className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding to Calendar...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Add to Calendar
              </div>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setProcessingStep("input")}
            disabled={loading}
            className="h-11"
          >
            Back
          </Button>
        </div>

        {/* Desktop order: Back first, then Primary action */}
        <div className="hidden sm:flex sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setProcessingStep("input")}
            disabled={loading}
            className="h-10"
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={handleAddToCalendar}
            disabled={loading || isAddingToCalendar}
            className="h-10"
          >
            {isAddingToCalendar ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding to Calendar...
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Add to Calendar
              </div>
            )}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );

  // Choose which confirmation step to render based on device
  const renderConfirmationStep = () => {
    return isMobile
      ? renderMobileConfirmationStep()
      : renderDesktopConfirmationStep();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`${
          isMobile
            ? "w-[95vw] max-h-[90vh] overflow-hidden"
            : "sm:max-w-[700px]"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {processingStep === "input" ? "Quick Add Tasks" : "Confirm Tasks"}
          </DialogTitle>
        </DialogHeader>

        {processingStep === "input"
          ? renderInputStep()
          : renderConfirmationStep()}
      </DialogContent>
    </Dialog>
  );
}
