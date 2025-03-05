"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Calendar } from "./ui/calendar";
import { TimePicker } from "./ui/time-picker";
import { format, parse, isValid, addDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  priority?: "low" | "medium" | "high";
}

interface TaskModalProps {
  onClose: () => void;
  onCreateTask: (task: Omit<Task, "id">) => Promise<void>;
  taskToEdit?: Task | null;
}

export default function TaskModal({
  onClose,
  onCreateTask,
  taskToEdit,
}: TaskModalProps) {
  const [title, setTitle] = useState(taskToEdit?.title || "");
  const [description, setDescription] = useState(taskToEdit?.description || "");

  // New state variables for date and time components
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTimeStr, setStartTimeStr] = useState("09:00"); // 24h format HH:MM for DateTimePicker
  const [endTimeStr, setEndTimeStr] = useState("10:00"); // 24h format HH:MM for DateTimePicker

  // State to control popover open/close
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Keep the original strings for compatibility with the form submit
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    taskToEdit?.priority || "medium"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Memoize the taskToEdit id to avoid unnecessary effect triggering
  const taskToEditId = useMemo(() => taskToEdit?.id, [taskToEdit?.id]);

  useEffect(() => {
    // Only run this effect when taskToEditId changes
    if (taskToEdit) {
      // When editing a task, properly format the date-time values
      try {
        const start = new Date(taskToEdit.startTime);

        // Set the start date
        setStartDate(start);

        // Set the start time in HH:MM format for the time picker
        const startHours = start.getHours().toString().padStart(2, "0");
        const startMinutes = start.getMinutes().toString().padStart(2, "0");
        setStartTimeStr(`${startHours}:${startMinutes}`);

        // Keep the original format for submission compatibility
        setStartTime(start.toISOString().slice(0, 16));

        let end;
        if (taskToEdit.endTime) {
          end = new Date(taskToEdit.endTime);
        } else {
          // If no end time, default to start time + 1 hour
          end = new Date(start);
          end.setHours(end.getHours() + 1);
        }

        // Set the end date
        setEndDate(end);

        // Set the end time in HH:MM format for the time picker
        const endHours = end.getHours().toString().padStart(2, "0");
        const endMinutes = end.getMinutes().toString().padStart(2, "0");
        setEndTimeStr(`${endHours}:${endMinutes}`);

        // Keep the original format for submission compatibility
        setEndTime(end.toISOString().slice(0, 16));
      } catch (e) {
        console.error("Error parsing date:", e);
      }
    } else {
      // Set default start time to current hour for new tasks
      const now = new Date();
      now.setMinutes(0);
      now.setSeconds(0);
      now.setMilliseconds(0);

      // Set the start date
      setStartDate(now);

      // Set the start time in HH:MM format for the time picker
      const startHours = now.getHours().toString().padStart(2, "0");
      const startMinutes = now.getMinutes().toString().padStart(2, "0");
      setStartTimeStr(`${startHours}:${startMinutes}`);

      // Keep the original format for submission compatibility
      setStartTime(now.toISOString().slice(0, 16));

      // Set default end time to one hour later
      const oneHourLater = new Date(now);
      oneHourLater.setHours(now.getHours() + 1);

      // Set the end date
      setEndDate(oneHourLater);

      // Set the end time in HH:MM format for the time picker
      const endHours = oneHourLater.getHours().toString().padStart(2, "0");
      const endMinutes = oneHourLater.getMinutes().toString().padStart(2, "0");
      setEndTimeStr(`${endHours}:${endMinutes}`);

      // Keep the original format for submission compatibility
      setEndTime(oneHourLater.toISOString().slice(0, 16));
    }
  }, [taskToEditId]);

  // Add a click-outside handler to close the date pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Make sure only one date picker is open at a time
      if (startDateOpen && endDateOpen) {
        // If somehow both are open (shouldn't happen), close one
        setEndDateOpen(false);
      }

      // Handle start date picker
      if (startDateOpen) {
        const startDateElement = document.querySelector(
          '[data-start-date-picker="true"]'
        );
        if (
          startDateElement &&
          !startDateElement.contains(event.target as Node)
        ) {
          setStartDateOpen(false);
        }
      }

      // Handle end date picker
      if (endDateOpen) {
        const endDateElement = document.querySelector(
          '[data-end-date-picker="true"]'
        );
        if (endDateElement && !endDateElement.contains(event.target as Node)) {
          setEndDateOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [startDateOpen, endDateOpen]);

  // Function to move both dates up by one day
  const moveDatesUpOneDay = useCallback(() => {
    if (startDate) {
      const newStartDate = new Date(startDate);
      newStartDate.setDate(newStartDate.getDate() + 1);
      setStartDate(newStartDate);
      setStartTime(newStartDate.toISOString().slice(0, 16));
    }
    if (endDate) {
      const newEndDate = new Date(endDate);
      newEndDate.setDate(newEndDate.getDate() + 1);
      setEndDate(newEndDate);
      setEndTime(newEndDate.toISOString().slice(0, 16));
    }
  }, [startDate, endDate]);

  // Function to move both dates down by one day
  const moveDatesDownOneDay = useCallback(() => {
    if (startDate) {
      const newStartDate = new Date(startDate);
      newStartDate.setDate(newStartDate.getDate() - 1);
      setStartDate(newStartDate);
      setStartTime(newStartDate.toISOString().slice(0, 16));
    }
    if (endDate) {
      const newEndDate = new Date(endDate);
      newEndDate.setDate(newEndDate.getDate() - 1);
      setEndDate(newEndDate);
      setEndTime(newEndDate.toISOString().slice(0, 16));
    }
  }, [startDate, endDate]);

  // Function to move both times up by 30 minutes
  const moveTimesUp30Min = useCallback(() => {
    if (startDate) {
      const newStartDate = new Date(startDate);
      newStartDate.setMinutes(newStartDate.getMinutes() + 30);
      setStartDate(newStartDate);
      setStartTime(newStartDate.toISOString().slice(0, 16));
      setStartTimeStr(
        `${newStartDate.getHours().toString().padStart(2, "0")}:${newStartDate
          .getMinutes()
          .toString()
          .padStart(2, "0")}`
      );
    }
    if (endDate) {
      const newEndDate = new Date(endDate);
      newEndDate.setMinutes(newEndDate.getMinutes() + 30);
      setEndDate(newEndDate);
      setEndTime(newEndDate.toISOString().slice(0, 16));
      setEndTimeStr(
        `${newEndDate.getHours().toString().padStart(2, "0")}:${newEndDate
          .getMinutes()
          .toString()
          .padStart(2, "0")}`
      );
    }
  }, [startDate, endDate]);

  // Function to move both times down by 30 minutes
  const moveTimesDown30Min = useCallback(() => {
    if (startDate) {
      const newStartDate = new Date(startDate);
      newStartDate.setMinutes(newStartDate.getMinutes() - 30);
      setStartDate(newStartDate);
      setStartTime(newStartDate.toISOString().slice(0, 16));
      setStartTimeStr(
        `${newStartDate.getHours().toString().padStart(2, "0")}:${newStartDate
          .getMinutes()
          .toString()
          .padStart(2, "0")}`
      );
    }
    if (endDate) {
      const newEndDate = new Date(endDate);
      newEndDate.setMinutes(newEndDate.getMinutes() - 30);
      setEndDate(newEndDate);
      setEndTime(newEndDate.toISOString().slice(0, 16));
      setEndTimeStr(
        `${newEndDate.getHours().toString().padStart(2, "0")}:${newEndDate
          .getMinutes()
          .toString()
          .padStart(2, "0")}`
      );
    }
  }, [startDate, endDate]);

  // Handler for start time changes
  const handleStartTimeChange = useCallback(
    (timeStr: string) => {
      setStartTimeStr(timeStr);
      if (startDate) {
        try {
          // Validate the time format before splitting
          if (!/^\d{1,2}:\d{2}$/.test(timeStr)) {
            console.error("Invalid time format:", timeStr);
            return;
          }

          const [hours, minutes] = timeStr.split(":").map(Number);
          const newDate = new Date(startDate);
          newDate.setHours(hours);
          newDate.setMinutes(minutes);
          setStartDate(newDate);
          setStartTime(newDate.toISOString().slice(0, 16));
        } catch (error) {
          console.error("Error parsing time:", error, timeStr);
        }
      }
    },
    [startDate]
  );

  // Handler for end time changes
  const handleEndTimeChange = useCallback(
    (timeStr: string) => {
      setEndTimeStr(timeStr);
      if (endDate) {
        try {
          // Validate the time format before splitting
          if (!/^\d{1,2}:\d{2}$/.test(timeStr)) {
            console.error("Invalid time format:", timeStr);
            return;
          }

          const [hours, minutes] = timeStr.split(":").map(Number);
          const newDate = new Date(endDate);
          newDate.setHours(hours);
          newDate.setMinutes(minutes);
          setEndDate(newDate);
          setEndTime(newDate.toISOString().slice(0, 16));
        } catch (error) {
          console.error("Error parsing time:", error, timeStr);
        }
      }
    },
    [endDate]
  );

  // Handler for start date changes
  const handleStartDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      const newDate = new Date(date);
      if (startDate) {
        newDate.setHours(startDate.getHours());
        newDate.setMinutes(startDate.getMinutes());
      }
      setStartDate(newDate);
      setStartTime(newDate.toISOString().slice(0, 16));
    },
    [startDate]
  );

  // Handler for end date changes
  const handleEndDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      const newDate = new Date(date);
      if (endDate) {
        newDate.setHours(endDate.getHours());
        newDate.setMinutes(endDate.getMinutes());
      }
      setEndDate(newDate);
      setEndTime(newDate.toISOString().slice(0, 16));
    },
    [endDate]
  );

  // Memoize the submit handler to prevent recreating it on each render
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      console.log("Task form submitted");

      if (!title.trim()) {
        setError("Title is required");
        return;
      }

      if (!startDate || !endDate) {
        setError("Start and end dates are required");
        return;
      }

      console.log("Setting isSubmitting to true");
      setIsSubmitting(true);
      setError("");

      try {
        // Combine date and time properly - with validation
        const startDateTime = new Date(startDate);

        if (!startTimeStr || !/^\d{1,2}:\d{2}$/.test(startTimeStr)) {
          throw new Error(`Invalid start time format: ${startTimeStr}`);
        }
        const [startHours, startMinutes] = startTimeStr.split(":").map(Number);
        startDateTime.setHours(startHours, startMinutes, 0, 0);

        const endDateTime = new Date(endDate);
        if (!endTimeStr || !/^\d{1,2}:\d{2}$/.test(endTimeStr)) {
          throw new Error(`Invalid end time format: ${endTimeStr}`);
        }
        const [endHours, endMinutes] = endTimeStr.split(":").map(Number);
        endDateTime.setHours(endHours, endMinutes, 0, 0);

        console.log("Calling onCreateTask with form data");
        const taskData = {
          title,
          description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          priority,
          ...(taskToEdit ? { id: taskToEdit.id } : {}),
        };

        console.log("Task data being sent:", JSON.stringify(taskData));
        await onCreateTask(taskData);

        console.log("onCreateTask completed successfully, closing modal");
        onClose();
      } catch (err) {
        console.error("Error creating task:", err);
        setError("Failed to create task. Please try again.");
        setIsSubmitting(false);
      }
      // Note: We don't set isSubmitting to false here if successful,
      // as the component will unmount when onClose() is called
    },
    [
      title,
      description,
      startDate,
      endDate,
      startTimeStr,
      endTimeStr,
      priority,
      taskToEdit,
      onCreateTask,
      onClose,
    ]
  );

  // Memoize component state to avoid unnecessary rerenders
  const dialogState = useMemo(
    () => ({
      isEditing: !!taskToEdit,
      title: taskToEdit ? "Edit Task" : "Create New Task",
      description: taskToEdit
        ? "Update your task details below."
        : "Add a new task to your schedule.",
      buttonText: taskToEdit ? "Update" : "Create",
    }),
    [taskToEdit]
  );

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto"
        style={{ zIndex: 50 }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {dialogState.title}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {dialogState.description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label
              htmlFor="title"
              className="text-sm font-medium text-slate-300"
            >
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label
              htmlFor="description"
              className="text-sm font-medium text-slate-300"
            >
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about your task"
              className="resize-none bg-slate-800 border-slate-700 text-white min-h-[100px]"
            />
          </div>
          <div className="grid gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-slate-300">
                  Start Date
                </Label>
                <div className="flex items-center space-x-2">
                  <div
                    className="relative w-full"
                    data-start-date-picker="true"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-slate-800 border-slate-700 text-white h-11 hover:bg-slate-700/50 transition-colors"
                      onClick={() => {
                        if (endDateOpen) {
                          // If the other picker is open, close it first
                          setEndDateOpen(false);
                          // Use a small timeout to prevent both calendars from appearing
                          setTimeout(() => {
                            setStartDateOpen(true);
                          }, 10);
                        } else {
                          // Simply toggle this calendar
                          setStartDateOpen(!startDateOpen);
                        }
                      }}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate
                        ? format(startDate, "MMM dd, yyyy")
                        : "Select date"}
                    </Button>

                    {startDateOpen && (
                      <div className="absolute z-30 mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-md shadow-lg">
                        <Calendar
                          mode="single"
                          selected={startDate || undefined}
                          onSelect={(date) => {
                            if (date) {
                              handleStartDateSelect(date);
                              setStartDateOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-medium text-slate-300">
                  End Date
                </Label>
                <div className="flex items-center space-x-2">
                  <div className="relative w-full" data-end-date-picker="true">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-slate-800 border-slate-700 text-white h-11 hover:bg-slate-700/50 transition-colors"
                      onClick={() => {
                        if (startDateOpen) {
                          // If the other picker is open, close it first
                          setStartDateOpen(false);
                          // Use a small timeout to prevent both calendars from appearing
                          setTimeout(() => {
                            setEndDateOpen(true);
                          }, 10);
                        } else {
                          // Simply toggle this calendar
                          setEndDateOpen(!endDateOpen);
                        }
                      }}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate
                        ? format(endDate, "MMM dd, yyyy")
                        : "Select date"}
                    </Button>

                    {endDateOpen && (
                      <div className="absolute z-30 mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-md shadow-lg">
                        <Calendar
                          mode="single"
                          selected={endDate || undefined}
                          onSelect={(date) => {
                            if (date) {
                              handleEndDateSelect(date);
                              setEndDateOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="start-time"
                  className="text-sm font-medium text-slate-300"
                >
                  Start Time
                </Label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <TimePicker
                      value={startTimeStr}
                      onChange={handleStartTimeChange}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="end-time"
                  className="text-sm font-medium text-slate-300"
                >
                  End Time
                </Label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <TimePicker
                      value={endTimeStr}
                      onChange={handleEndTimeChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-300">
              Quick Adjustments
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-md p-2 border border-slate-700">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 mb-1">Time</span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={moveTimesDown30Min}
                      className="flex-1 h-8 text-sm px-2 bg-slate-700 hover:bg-slate-600"
                    >
                      -30m
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={moveTimesUp30Min}
                      className="flex-1 h-8 text-sm px-2 bg-slate-700 hover:bg-slate-600"
                    >
                      +30m
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800 rounded-md p-2 border border-slate-700">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 mb-1">Date</span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={moveDatesDownOneDay}
                      className="flex-1 h-8 text-sm px-2 bg-slate-700 hover:bg-slate-600"
                    >
                      -1d
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={moveDatesUpOneDay}
                      className="flex-1 h-8 text-sm px-2 bg-slate-700 hover:bg-slate-600"
                    >
                      +1d
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label
              htmlFor="priority"
              className="text-sm font-medium text-slate-300"
            >
              Priority
            </Label>
            <Select
              value={priority}
              onValueChange={(value) =>
                setPriority(value as "high" | "medium" | "low")
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-11">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="low" className="hover:bg-slate-700">
                  Low
                </SelectItem>
                <SelectItem value="medium" className="hover:bg-slate-700">
                  Medium
                </SelectItem>
                <SelectItem value="high" className="hover:bg-slate-700">
                  High
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <div className="text-red-400 text-sm mt-1">{error}</div>}
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2 mt-2">
          {/* Mobile order: Submit first, then Cancel */}
          <div className="flex flex-col sm:hidden w-full gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center w-full">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                  Processing...
                </div>
              ) : (
                dialogState.buttonText
              )}
            </Button>
            <Button variant="outline" onClick={onClose} className="h-11">
              Cancel
            </Button>
          </div>

          {/* Desktop order: Cancel first, then Submit */}
          <div className="hidden sm:flex sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-auto h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-auto h-10"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center w-full">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                  Processing...
                </div>
              ) : (
                dialogState.buttonText
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
