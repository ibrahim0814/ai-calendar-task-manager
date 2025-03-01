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
import { format } from "date-fns";

const taskConfirmSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:mm format"),
    duration: z.number().min(15).max(480),
    priority: z.enum(["high", "medium", "low"])
  }))
});

type TaskConfirmData = z.infer<typeof taskConfirmSchema>;

interface TaskConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskExtract[];
  onConfirm: (tasks: { tasks: TaskExtract[] }) => void;
}

export function TaskConfirmationDialog({
  isOpen,
  onClose,
  tasks,
  onConfirm,
}: TaskConfirmationDialogProps) {
  console.log("TaskConfirmationDialog received tasks:", tasks); // Add logging

  const form = useForm<TaskConfirmData>({
    resolver: zodResolver(taskConfirmSchema),
    defaultValues: {
      tasks: tasks.map((task, index) => ({
        ...task,
        startTime: task.startTime || format(
          new Date(new Date().setHours(9 + index, 0, 0, 0)),
          "HH:mm"
        ),
      })),
    },
  });

  console.log("Form default values:", form.getValues()); // Add logging

  const onSubmit = (data: TaskConfirmData) => {
    console.log("Submitting task data:", data); // Add logging
    onConfirm(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Tasks</DialogTitle>
          <DialogDescription>
            Review and adjust your tasks before they are scheduled.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
              {tasks.map((task, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/5">
                  <FormField
                    control={form.control}
                    name={`tasks.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Task {index + 1}</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                      name={`tasks.${index}.duration`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Duration (min)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={15}
                              max={480}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
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
              <Button type="submit">Schedule Tasks</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}