"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  formatTime,
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
import { DateTimePicker } from "./ui/date-time-picker";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Label } from "./ui/label";
import TaskDayView from "./task-day-view";
import { useIsMobile } from "../hooks/use-mobile";

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()); // Today as default
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Add effect for click-outside handling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
      if (editingTaskIndex !== null) {
        // Check if clicked outside any task date picker
        const taskDateElement = document.querySelector(
          `[data-task-date-picker="${editingTaskIndex}"]`
        );
        if (
          taskDateElement &&
          !taskDateElement.contains(event.target as Node)
        ) {
          // If click outside and dataset exists, clear it
          if (
            document.body.dataset[`task-date-open-${editingTaskIndex}`] ===
            "true"
          ) {
            document.body.dataset[`task-date-open-${editingTaskIndex}`] =
              "false";
            // Force re-render
            setExtractedTasks([...extractedTasks]);
          }
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDatePicker, editingTaskIndex, extractedTasks]);

  // Helper function to sort tasks by time
  const sortTasksByTime = useCallback((tasks: TaskExtract[]) => {
    return [...tasks].sort((a, b) => {
      // Sort by time (HH:MM format)
      const timeA = a.startTime;
      const timeB = b.startTime;

      // Compare hours first
      const [hoursA, minutesA] = timeA.split(":").map(Number);
      const [hoursB, minutesB] = timeB.split(":").map(Number);

      if (hoursA !== hoursB) {
        return hoursA - hoursB;
      }

      // If hours are the same, compare minutes
      return minutesA - minutesB;
    });
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

        const tasks: TaskExtract[] = await response.json();
        console.log("Successfully extracted tasks:", JSON.stringify(tasks));

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

        // If tasks have a date, set the selectedDate to the first task's date
        if (tasks.length > 0 && tasks[0].date) {
          // Make sure we're using an actual Date object
          const taskDate =
            tasks[0].date instanceof Date
              ? tasks[0].date
              : new Date(tasks[0].date);
          console.log(
            "Setting selected date from extracted task:",
            taskDate.toISOString()
          );
          setSelectedDate(taskDate);
        }

        // Ensure all tasks have proper Date objects for their dates
        const processedTasks = tasks.map((task) => ({
          ...task,
          date: task.date instanceof Date ? task.date : undefined,
        }));

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

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority?.toLowerCase()) {
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
        // Create updated tasks array
        const updated = [...prev];

        // Special handling for date field - ensure it's a proper Date object
        if (field === "date" && value) {
          // If value is a Date object, use it directly
          if (value instanceof Date) {
            updated[index] = {
              ...updated[index],
              [field]: new Date(value),
            };
          }
          // If value is a string, convert to Date
          else if (typeof value === "string") {
            try {
              updated[index] = {
                ...updated[index],
                [field]: new Date(value),
              };
            } catch (e) {
              console.error("Error converting date string to Date object:", e);
              // Keep the existing value if there's an error
              updated[index] = { ...updated[index] };
            }
          } else {
            // For any other value type, just use as is
            updated[index] = {
              ...updated[index],
              [field]: value,
            };
          }
        } else {
          // For non-date fields, update normally
          updated[index] = {
            ...updated[index],
            [field]: value,
          };
        }

        // Sort tasks by time if we're updating the startTime field
        if (field === "startTime") {
          return sortTasksByTime(updated);
        }

        return updated;
      });
    },
    [sortTasksByTime]
  );

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
              <div className="flex space-x-1 ml-2">
                {priorityOptions.map((option) => (
                  <Badge
                    key={option.value}
                    className={`${option.color} cursor-pointer transition-all ${
                      task.priority === option.value
                        ? "scale-110 border border-white"
                        : "opacity-70"
                    }`}
                    onClick={() => {
                      updateTaskField(index, "priority", option.value);
                    }}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            ) : (
              <Badge
                className={`${getPriorityColor(task.priority)} cursor-pointer`}
                onClick={() => setEditingTaskIndex(index)}
              >
                {task.priority.toLowerCase()}
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
                  <div className="flex flex-col gap-2">
                    <div className="inline-flex items-center">
                      <DateTimePicker
                        value={task.startTime}
                        onChange={(newTime) =>
                          updateTaskField(index, "startTime", newTime)
                        }
                        className="w-[140px] h-8 bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>

                    <div
                      className="relative w-full flex"
                      data-task-date-picker={index.toString()}
                    >
                      <div
                        className="w-full flex items-center justify-between h-7 bg-slate-700 border border-slate-600 text-white text-xs rounded-md px-3 cursor-pointer"
                        onClick={() => {
                          // Create a unique state variable for each task
                          const uniqueKey = `edit-task-date-${index}`;
                          setEditingTaskIndex((prev) =>
                            prev === index ? null : index
                          );

                          // Clear any other open calendars
                          Object.keys(document.body.dataset)
                            .filter((key) => key.startsWith("task-date-open-"))
                            .forEach((key) => {
                              document.body.dataset[key] = "false";
                            });

                          // Toggle this calendar
                          document.body.dataset[`task-date-open-${index}`] =
                            document.body.dataset[`task-date-open-${index}`] ===
                            "true"
                              ? "false"
                              : "true";

                          // Force re-render
                          setExtractedTasks([...extractedTasks]);
                        }}
                      >
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>
                            {task.date
                              ? formatShortDate(task.date)
                              : selectedDate
                              ? formatShortDate(selectedDate)
                              : "Today"}
                          </span>
                        </div>
                        <span className="text-slate-400">▼</span>
                      </div>

                      {/* Calendar dropdown */}
                      {document.body.dataset[`task-date-open-${index}`] ===
                        "true" && (
                        <div className="absolute z-[9999] mt-1 left-0 right-0 top-full bg-slate-800 border border-slate-700 rounded-md shadow-lg overflow-hidden">
                          <CalendarComponent
                            mode="single"
                            selected={task.date ? new Date(task.date) : selectedDate}
                            onSelect={(date) => {
                              if (date) {
                                // Make a complete fresh Date object to avoid any reference issues
                                const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                updateTaskField(index, "date", newDate);
                                // Close the calendar
                                document.body.dataset[`task-date-open-${index}`] = "false";
                                // Force re-render
                                setExtractedTasks([...extractedTasks]);
                              }
                            }}
                            initialFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="inline-flex items-center">
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
                      className="h-7 w-7 p-0 rounded-full bg-slate-700 hover:bg-slate-600"
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
                {task.date && !isSameDay(task.date, new Date()) && (
                  <div className="flex items-center text-blue-400">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatShortDate(task.date)}
                  </div>
                )}
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

      setExtractedTasks((prevTasks) => {
        return prevTasks.map((task) => {
          // Create a new Date object for each task to prevent reference issues
          return {
            ...task,
            date: new Date(cleanDate),
          };
        });
      });

      // Set the selected date (for UI highlighting)
      setSelectedDate(cleanDate);
      console.log("Updated all tasks to date:", cleanDate.toISOString());
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

        <div className="relative w-full" data-date-picker="true">
          <div
            className="w-full flex items-center justify-center gap-1 h-9 bg-slate-800 border border-slate-700 rounded-md px-3 mt-1 cursor-pointer text-xs"
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
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {selectedDate &&
              !isSameDay(selectedDate, new Date()) &&
              !isSameDay(selectedDate, addDays(new Date(), 1))
                ? formatShortDate(selectedDate)
                : "Custom Date"}
            </span>
          </div>

          {showDatePicker && (
            <div className="absolute z-[9999] mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-md shadow-lg overflow-hidden">
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
                initialFocus
              />
            </div>
          )}
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
        <div className="flex items-center space-x-2">
          <div className="text-sm text-slate-400 mr-1">Schedule for:</div>
          <Button
            variant={
              selectedDate && isSameDay(selectedDate, new Date())
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => updateAllTaskDates(new Date())}
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
          <div className="relative w-full" data-date-picker="true">
            <div
              className="w-full flex items-center justify-between h-8 bg-slate-800 border border-slate-700 rounded-md px-3 cursor-pointer text-xs hover:bg-slate-700/50 transition-colors"
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
            >
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {selectedDate &&
                  !isSameDay(selectedDate, new Date()) &&
                  !isSameDay(selectedDate, addDays(new Date(), 1))
                    ? formatShortDate(selectedDate)
                    : "Custom"}
                </span>
              </div>
            </div>

            {showDatePicker && (
              <div className="absolute z-[9999] mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-md shadow-lg overflow-hidden">
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
