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
  onConfirm: (tasks: TaskConfirmData) => void;
}

export function TaskConfirmationDialog({
  isOpen,
  onClose,
  tasks,
  onConfirm,
}: TaskConfirmationDialogProps) {
  const form = useForm<TaskConfirmData>({
    resolver: zodResolver(taskConfirmSchema),
    defaultValues: {
      tasks: tasks.map((task, index) => ({
        ...task,
        startTime: format(
          new Date(new Date().setHours(9 + index, 0, 0, 0)),
          "HH:mm"
        ),
      })),
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm Tasks</DialogTitle>
          <DialogDescription>
            Review and adjust the timing of your tasks before they are added to your calendar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onConfirm)} className="space-y-4">
            {tasks.map((task, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <FormField
                  control={form.control}
                  name={`tasks.${index}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                          <Input
                            type="time"
                            {...field}
                          />
                        </FormControl>
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
                            min={15}
                            max={480}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
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
