import { Card, CardContent } from "@/components/ui/card";
import { Task } from "@shared/schema";
import { format } from "date-fns";

interface TaskListProps {
  tasks: Task[];
}

export default function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="space-y-4 mt-4">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-gray-500">{task.description}</p>
                )}
              </div>
              {task.scheduledStart && (
                <div className="text-sm text-gray-500">
                  {format(new Date(task.scheduledStart), "MMM d, h:mm a")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
