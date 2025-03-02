import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TaskExtract } from "@shared/schema";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const HOUR_HEIGHT = 60; // pixels per hour
const MINUTES_PER_HOUR = 60;
const HOURS_IN_DAY = 24;
const SNAP_MINUTES = 15; // Snap to 15-minute increments

interface TaskConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskExtract[];
  onConfirm: (tasks: TaskExtract[]) => void;
}

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:mm format"),
  duration: z.number().min(15).max(480)
});

type ViewMode = 'calendar' | 'list';

export function TaskConfirmationDialog({
  isOpen,
  onClose,
  tasks: initialTasks,
  onConfirm,
}: TaskConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      tasks: initialTasks
    }
  });

  // Fetch existing calendar events
  const { data: existingEvents } = useQuery({
    queryKey: ['/api/tasks'],
    enabled: isOpen,
  });

  // Convert minutes since start of day to pixels
  const minutesToPixels = (minutes: number) => {
    return (minutes / MINUTES_PER_HOUR) * HOUR_HEIGHT;
  };

  // Convert pixels to minutes since start of day, snapped to 15-minute increments
  const pixelsToMinutes = (pixels: number) => {
    const rawMinutes = Math.round((pixels / HOUR_HEIGHT) * MINUTES_PER_HOUR);
    return Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
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

  // Format time in 12-hour format with AM/PM
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const handleDragStart = (e: React.DragEvent, taskIndex: number) => {
    e.dataTransfer.setData('text/plain', String(taskIndex));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskIndex = Number(e.dataTransfer.getData('text/plain'));
    const timelineRect = e.currentTarget.getBoundingClientRect();
    const dropMinutes = pixelsToMinutes(e.clientY - timelineRect.top);

    const updatedTasks = [...tasks];
    const task = updatedTasks[taskIndex];

    const newStartTime = minutesToTime(dropMinutes);
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
    } catch (error) {
      console.error("Failed to schedule tasks:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate markers for hours and half hours
  const timeMarkers = Array.from({ length: HOURS_IN_DAY * 2 }, (_, i) => {
    const minutes = i * 30;
    const hour = Math.floor(minutes / 60);
    const isHour = minutes % 60 === 0;
    const isAM = hour < 12;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

    return (
      <div
        key={minutes}
        className={cn(
          "absolute w-full border-t",
          isHour ? "border-border" : "border-border/30"
        )}
        style={{ top: `${minutesToPixels(minutes)}px` }}
      >
        {isHour && (
          <span className="absolute -mt-3 -ml-12 w-10 text-right text-xs text-muted-foreground">
            {displayHour} {isAM ? 'AM' : 'PM'}
          </span>
        )}
      </div>
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Confirm Tasks</DialogTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                onClick={() => setViewMode('calendar')}
              >
                Calendar
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
          </div>
          <DialogDescription>
            {viewMode === 'calendar' 
              ? 'Drag tasks to adjust their timing. Gray blocks show existing events.'
              : 'Edit task details directly. All times are in 15-minute increments.'
            }
          </DialogDescription>
        </DialogHeader>

        {viewMode === 'calendar' ? (
          <div className="relative h-[500px] overflow-y-auto mt-4">
            <div 
              className="absolute inset-0 ml-14"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {timeMarkers}

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
                    className="absolute left-0 right-4 bg-muted/30 hover:bg-muted/40 border border-border/50 rounded-md shadow-sm"
                    style={{
                      top: `${minutesToPixels(startMinutes)}px`,
                      height: `${minutesToPixels(duration)}px`,
                      minHeight: '24px',
                    }}
                  >
                    <div className="p-2">
                      <div className="font-medium text-sm text-muted-foreground truncate">
                        {event.title}
                      </div>
                      <div className="text-xs text-muted-foreground/80">
                        {format(start, "h:mm a")} - {format(end, "h:mm a")}
                      </div>
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
                    className="absolute left-0 right-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-md shadow-sm cursor-move"
                    style={{
                      top: `${minutesToPixels(startMinutes)}px`,
                      height: `${minutesToPixels(task.duration)}px`,
                      minHeight: '24px',
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                  >
                    <div className="p-2">
                      <div className="font-medium text-sm truncate">
                        {task.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(task.startTime)} - {formatTime(minutesToTime(startMinutes + task.duration))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4 max-h-[500px] overflow-y-auto">
            {tasks.map((task, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <FormField
                  control={form.control}
                  name={`tasks.${index}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`tasks.${index}.startTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" step="900" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`tasks.${index}.duration`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="15" 
                            max="480" 
                            step="15" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

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