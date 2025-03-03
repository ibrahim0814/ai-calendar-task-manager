"use client";

import { useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { TaskExtract } from "../../lib/types";
import { Badge } from "./ui/badge";
import { formatTime, formatDuration } from "../utils/date-utils";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { DateTimePicker } from "./ui/date-time-picker";
import { Label } from "./ui/label";

interface NaturalLanguageModalProps {
  onClose: () => void;
  onCreateTasks: (tasks: TaskExtract[]) => Promise<void>;
}

export default function NaturalLanguageModal({
  onClose,
  onCreateTasks,
}: NaturalLanguageModalProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<TaskExtract[]>([]);
  const [processingStep, setProcessingStep] = useState<
    "input" | "confirmation"
  >("input");
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);

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

        if (!tasks || tasks.length === 0) {
          console.error("No tasks extracted from the input");
          throw new Error("No tasks could be extracted from your text");
        }

        setExtractedTasks(tasks);
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
    [text]
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
      onClose();
    } catch (error) {
      console.error("Error adding tasks to calendar:", error);
      setError("Failed to add tasks to calendar");
    } finally {
      console.log("Setting isAddingToCalendar to false");
      setIsAddingToCalendar(false);
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
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
        return updated;
      });
    },
    []
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

  const parseTimeFrom12Hour = useCallback((time12h: string) => {
    const [timePart, ampm] = time12h.split(" ");
    const [hours, minutes] = timePart.split(":");
    let hour = parseInt(hours, 10);

    if (ampm.toUpperCase() === "PM" && hour < 12) {
      hour += 12;
    }
    if (ampm.toUpperCase() === "AM" && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, "0")}:${minutes}`;
  }, []);

  const get12HourFormat = useCallback((hour24: number) => {
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12; // Convert 0 to 12
    return { hour12, ampm };
  }, []);

  const convertTo24Hour = useCallback((hour12: number, ampm: string) => {
    if (ampm === "PM" && hour12 < 12) {
      return hour12 + 12;
    }
    if (ampm === "AM" && hour12 === 12) {
      return 0;
    }
    return hour12;
  }, []);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            {processingStep === "input"
              ? "Natural Language Input"
              : "Confirm Tasks"}
          </DialogTitle>
        </DialogHeader>

        {processingStep === "input" ? (
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Extract Tasks"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-4 flex flex-col">
            <div className="space-y-4 max-h-[60vh] sm:max-h-[400px] overflow-y-auto mb-4">
              {extractedTasks.map((task, index) => (
                <div
                  key={index}
                  className="p-4 border border-slate-700 rounded-md shadow-sm bg-slate-900 text-white"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg text-white">
                      {task.title}
                    </h3>

                    {editingTaskIndex === index ? (
                      <div className="flex space-x-1">
                        {priorityOptions.map((option) => (
                          <Badge
                            key={option.value}
                            className={`${
                              option.color
                            } cursor-pointer transition-all ${
                              task.priority === option.value
                                ? "scale-110 border border-white"
                                : "opacity-70"
                            }`}
                            onClick={() => {
                              updateTaskField(index, "priority", option.value);
                              // Uncomment if you want clicking to exit edit mode
                              // setEditingTaskIndex(null);
                            }}
                          >
                            {option.label}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge
                        className={`${getPriorityColor(
                          task.priority
                        )} cursor-pointer`}
                        onClick={() => setEditingTaskIndex(index)}
                      >
                        {task.priority.toLowerCase()}
                      </Badge>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-slate-300 mb-2 text-sm">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center text-sm text-slate-300 gap-3">
                    {editingTaskIndex === index ? (
                      <div className="flex items-center justify-between w-full gap-2 p-2 bg-slate-800/50 rounded-md">
                        <div className="flex flex-wrap items-center gap-3 w-full">
                          <div className="inline-flex items-center">
                            <DateTimePicker
                              value={task.startTime}
                              onChange={(newTime) =>
                                updateTaskField(index, "startTime", newTime)
                              }
                              className="w-[140px] h-8 bg-slate-700 border-slate-600 text-white text-sm"
                            />
                          </div>

                          <div className="inline-flex items-center">
                            <Select
                              value={task.duration.toString()}
                              onValueChange={(value) =>
                                updateTaskField(
                                  index,
                                  "duration",
                                  parseInt(value)
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-[100px] bg-slate-700 border-slate-600 text-white text-sm">
                                <SelectValue placeholder="Duration" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                {[15, 30, 45, 60, 90, 120, 180, 240].map(
                                  (mins) => (
                                    <SelectItem
                                      key={mins}
                                      value={mins.toString()}
                                    >
                                      {mins} min
                                      {mins > 60
                                        ? ` (${Math.floor(mins / 60)}h${
                                            mins % 60 ? ` ${mins % 60}m` : ""
                                          })`
                                        : ""}
                                    </SelectItem>
                                  )
                                )}
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

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProcessingStep("input")}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleAddToCalendar}
                disabled={loading || isAddingToCalendar}
                className="w-full sm:w-auto"
              >
                {isAddingToCalendar ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding to Calendar...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Add to Calendar
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
