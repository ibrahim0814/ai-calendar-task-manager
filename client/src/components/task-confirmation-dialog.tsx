import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskExtract } from "@shared/schema";
import { format, parse, addMinutes } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

const HOUR_HEIGHT = 60; // pixels per hour
const MINUTES_PER_HOUR = 60;
const HOURS_IN_DAY = 24;

interface TaskConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskExtract[];
  onConfirm: (tasks: TaskExtract[]) => void;
}

export function TaskConfirmationDialog({
  isOpen,
  onClose,
  tasks: initialTasks,
  onConfirm,
}: TaskConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);

  // Fetch existing calendar events
  const { data: existingEvents } = useQuery({
    queryKey: ['/api/tasks'],
    enabled: isOpen,
  });

  // Convert minutes since start of day to pixels
  const minutesToPixels = (minutes: number) => {
    return (minutes / MINUTES_PER_HOUR) * HOUR_HEIGHT;
  };

  // Convert pixels to minutes since start of day
  const pixelsToMinutes = (pixels: number) => {
    return Math.round((pixels / HOUR_HEIGHT) * MINUTES_PER_HOUR);
  };

  // Convert time string to minutes since start of day
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * MINUTES_PER_HOUR + minutes;
  };

  // Convert minutes since start of day to time string
  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    const mins = minutes % MINUTES_PER_HOUR;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const handleDragStart = (e: React.DragEvent, taskIndex: number) => {
    e.dataTransfer.setData('text/plain', String(taskIndex));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const timelineRect = e.currentTarget.getBoundingClientRect();
    const minutes = pixelsToMinutes(e.clientY - timelineRect.top);
    // Optional: show a preview line at the current drag position
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskIndex = Number(e.dataTransfer.getData('text/plain'));
    const timelineRect = e.currentTarget.getBoundingClientRect();
    const dropMinutes = pixelsToMinutes(e.clientY - timelineRect.top);

    const updatedTasks = [...tasks];
    const task = updatedTasks[taskIndex];
    const taskStartMinutes = timeToMinutes(task.startTime);
    const minutesDiff = dropMinutes - taskStartMinutes;

    const newStartTime = minutesToTime(dropMinutes);
    const newEndTime = minutesToTime(dropMinutes + task.duration);

    updatedTasks[taskIndex] = {
      ...task,
      startTime: newStartTime
    };

    setTasks(updatedTasks);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(tasks);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate hour markers
  const hourMarkers = Array.from({ length: HOURS_IN_DAY }, (_, i) => {
    const hour = i;
    const isAM = hour < 12;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return (
      <div
        key={hour}
        className="absolute w-full border-t border-border"
        style={{ top: `${hour * HOUR_HEIGHT}px` }}
      >
        <span className="text-xs text-muted-foreground -mt-2 inline-block">
          {displayHour} {isAM ? 'AM' : 'PM'}
        </span>
      </div>
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Confirm Tasks</DialogTitle>
          <DialogDescription>
            Drag tasks to adjust their timing. Gray blocks show existing events.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[600px] overflow-y-auto mt-4">
          <div 
            className="absolute inset-0"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {hourMarkers}

            {/* Existing events in gray */}
            {existingEvents?.map((event: any, index: number) => {
              if (!event.scheduledStart || !event.scheduledEnd) return null;
              const start = new Date(event.scheduledStart);
              const end = new Date(event.scheduledEnd);
              const startMinutes = start.getHours() * 60 + start.getMinutes();
              const duration = (end.getTime() - start.getTime()) / (1000 * 60);

              return (
                <div
                  key={`existing-${index}`}
                  className="absolute left-0 right-0 bg-muted/50 rounded"
                  style={{
                    top: `${minutesToPixels(startMinutes)}px`,
                    height: `${minutesToPixels(duration)}px`,
                  }}
                >
                  <div className="p-2 text-xs text-muted-foreground">
                    {event.title}
                  </div>
                </div>
              );
            })}

            {/* New tasks being scheduled */}
            {tasks.map((task, index) => {
              const startMinutes = timeToMinutes(task.startTime);
              return (
                <div
                  key={`task-${index}`}
                  className="absolute left-0 right-0 bg-primary/20 border border-primary/50 rounded cursor-move"
                  style={{
                    top: `${minutesToPixels(startMinutes)}px`,
                    height: `${minutesToPixels(task.duration)}px`,
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                >
                  <div className="p-2 text-xs">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-muted-foreground">
                      {task.startTime} - {minutesToTime(startMinutes + task.duration)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Scheduling...
              </>
            ) : (
              'Schedule Tasks'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}