import { Task } from "@shared/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2 } from "lucide-react";

interface DayViewProps {
  tasks: Task[];
}

export default function DayView({ tasks }: DayViewProps) {
  const today = new Date();
  const todaysTasks = tasks.filter(task => {
    if (!task.scheduledStart) return false;
    const taskDate = new Date(task.scheduledStart);
    return (
      taskDate.getDate() === today.getDate() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getFullYear() === today.getFullYear()
    );
  });

  todaysTasks.sort((a, b) => {
    if (!a.scheduledStart || !b.scheduledStart) return 0;
    return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Today's Schedule - {format(today, "MMMM d")}
      </h2>
      
      <div className="space-y-3">
        {todaysTasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tasks scheduled for today</p>
        ) : (
          todaysTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 border rounded-lg space-y-2 bg-background hover:bg-accent/5 transition-colors"
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
                  {format(new Date(task.scheduledStart), "h:mm a")}
                  {task.scheduledEnd && (
                    <> - {format(new Date(task.scheduledEnd), "h:mm a")}</>
                  )}
                </p>
              )}
              
              {task.description && (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
