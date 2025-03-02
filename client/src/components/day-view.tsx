import { Task } from "@shared/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayViewProps {
  tasks: Task[];
}

export default function DayView({ tasks }: DayViewProps) {
  // Get today's date in Pacific Time
  const today = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  const todayDate = new Date(today);

  const todaysTasks = tasks.filter(task => {
    if (!task.scheduledStart) return false;
    const taskDate = new Date(task.scheduledStart);
    const taskInPT = new Date(taskDate.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    return (
      taskInPT.getDate() === todayDate.getDate() &&
      taskInPT.getMonth() === todayDate.getMonth() &&
      taskInPT.getFullYear() === todayDate.getFullYear()
    );
  });

  todaysTasks.sort((a, b) => {
    if (!a.scheduledStart || !b.scheduledStart) return 0;
    return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Today's Schedule - {format(todayDate, "MMMM d")}
      </h2>

      <div className="space-y-3">
        {todaysTasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tasks scheduled for today</p>
        ) : (
          todaysTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "p-3 border rounded-lg space-y-2 bg-background hover:bg-accent/5 transition-colors",
                task.isAICreated && "border-primary/50"
              )}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{task.title}</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {task.scheduledStart && (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(task.scheduledStart).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }), "h:mm a")}
                  {task.scheduledEnd && (
                    <> - {format(new Date(task.scheduledEnd).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }), "h:mm a")}</>
                  )}
                </p>
              )}

              {task.description && (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              )}

              {task.isAICreated && (
                <div className="text-xs text-primary/70">AI Assistant Task</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}