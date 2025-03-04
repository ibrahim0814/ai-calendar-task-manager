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
        const startDate = new Date(taskToEdit.startTime);
        const formattedStartTime = startDate.toISOString().slice(0, 16);
        setStartTime(formattedStartTime);

        if (taskToEdit.endTime) {
          const endDate = new Date(taskToEdit.endTime);
          const formattedEndTime = endDate.toISOString().slice(0, 16);
          setEndTime(formattedEndTime);
        } else {
          // If no end time, default to start time + 1 hour
          const defaultEndDate = new Date(startDate);
          defaultEndDate.setHours(defaultEndDate.getHours() + 1);
          setEndTime(defaultEndDate.toISOString().slice(0, 16));
        }
      } catch (e) {
        console.error("Error parsing date:", e);
      }
    } else if (!startTime) {
      // Set default start time to current hour for new tasks
      const now = new Date();
      now.setMinutes(0);
      now.setSeconds(0);
      now.setMilliseconds(0);
      setStartTime(now.toISOString().slice(0, 16));

      // Set default end time to one hour later
      const oneHourLater = new Date(now);
      oneHourLater.setHours(now.getHours() + 1);
      setEndTime(oneHourLater.toISOString().slice(0, 16));
    }
  }, [taskToEditId, startTime]);

  // Memoize the submit handler to prevent recreating it on each render
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      console.log("Task form submitted");

      if (!title.trim()) {
        setError("Title is required");
        return;
      }

      if (!startTime || !endTime) {
        setError("Start and end times are required");
        return;
      }

      console.log("Setting isSubmitting to true");
      setIsSubmitting(true);
      setError("");

      try {
        console.log("Calling onCreateTask with form data");
        const taskData = {
          title,
          description,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
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
      startTime,
      endTime,
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
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{dialogState.title}</DialogTitle>
          <DialogDescription className="text-slate-300">{dialogState.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-sm font-medium text-slate-300">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-sm font-medium text-slate-300">Description</Label>
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
                <Label htmlFor="start-time" className="text-sm font-medium text-slate-300">Start Time</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-800 border-slate-700 text-white h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-time" className="text-sm font-medium text-slate-300">End Time</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-800 border-slate-700 text-white h-11"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority" className="text-sm font-medium text-slate-300">Priority</Label>
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
                <SelectItem value="low" className="hover:bg-slate-700">Low</SelectItem>
                <SelectItem value="medium" className="hover:bg-slate-700">Medium</SelectItem>
                <SelectItem value="high" className="hover:bg-slate-700">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <div className="text-red-400 text-sm mt-1">{error}</div>
          )}
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
            <Button 
              variant="outline" 
              onClick={onClose}
              className="h-11"
            >
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
