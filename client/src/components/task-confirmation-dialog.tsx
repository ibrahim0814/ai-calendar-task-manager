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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, addMinutes, parse } from "date-fns";
import { Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const taskConfirmSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:mm format"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:mm format"),
    priority: z.enum(["high", "medium", "low"])
  }))
});

type TaskConfirmData = z.infer<typeof taskConfirmSchema>;

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
  const form = useForm<TaskConfirmData>({
    resolver: zodResolver(taskConfirmSchema),
    defaultValues: {
      tasks: initialTasks.map((task) => {
        const startTime = task.startTime || format(new Date().setHours(9, 0, 0, 0), "HH:mm");
        const taskStartDate = parse(startTime, "HH:mm", new Date());
        const endTime = format(addMinutes(taskStartDate, task.duration), "HH:mm");

        return {
          ...task,
          startTime,
          endTime
        };
      }),
    },
  });

  const removeTask = (index: number) => {
    const currentTasks = form.getValues("tasks");
    const newTasks = [...currentTasks];
    newTasks.splice(index, 1);
    form.setValue("tasks", newTasks);
  };

  const onSubmit = async (data: TaskConfirmData) => {
    try {
      setIsSubmitting(true);
      // Convert endTime back to duration for API compatibility
      const tasksWithDuration = data.tasks.map(task => {
        const startDate = parse(task.startTime, "HH:mm", new Date());
        const endDate = parse(task.endTime, "HH:mm", new Date());
        const durationInMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

        // Ensure duration is positive
        if (durationInMinutes <= 0) {
          throw new Error(`Invalid duration for task "${task.title}": end time must be after start time`);
        }

        return {
          title: task.title,
          description: task.description || "",
          startTime: task.startTime,
          duration: durationInMinutes,
          priority: task.priority
        };
      });

      await onConfirm(tasksWithDuration);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Confirm Tasks</DialogTitle>
          <DialogDescription>
            Review and adjust your tasks before they are scheduled.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
              {form.watch("tasks").map((task, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/5">
                  <div className="flex justify-between items-start">
                    <FormField
                      control={form.control}
                      name={`tasks.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="flex-1 mr-4">
                          <FormLabel className="text-sm font-medium">Task {index + 1}</FormLabel>
                          <FormControl>
                            <Input {...field} className="text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeTask(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`tasks.${index}.startTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Start Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              className="text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`tasks.${index}.endTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">End Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              className="text-sm"
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}