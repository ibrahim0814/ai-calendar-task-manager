import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { TaskConfirmationDialog } from "./task-confirmation-dialog";
import { TaskExtract } from "@shared/schema";

interface TaskInputProps {
  onTasksCreated: () => void;
}

export default function TaskInput({ onTasksCreated }: TaskInputProps) {
  const [text, setText] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<TaskExtract[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  const extractMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/tasks/extract", { text });
      const data = await res.json();
      return data;
    },
    onSuccess: (tasks: TaskExtract[]) => {
      setExtractedTasks(tasks);
      setShowConfirmation(true);
    },
    onError: (error) => {
      console.error("Task extraction error:", error);
      toast({
        title: "Error",
        description: "Failed to extract tasks from your input",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (tasks: TaskExtract[]) => {
      console.log("Creating tasks:", tasks);
      const res = await apiRequest("POST", "/api/tasks/process", { tasks });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || "Failed to process tasks");
      }
      return res.json();
    },
    onSuccess: () => {
      setText("");
      setShowConfirmation(false);
      onTasksCreated();
      toast({
        title: "Success",
        description: "Your tasks have been scheduled successfully",
      });
    },
    onError: (error) => {
      console.error("Task creation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Describe your tasks for the day..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[100px]"
      />
      <Button
        onClick={() => extractMutation.mutate(text)}
        disabled={extractMutation.isPending || !text.trim()}
        className="w-full"
      >
        {extractMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Process Tasks
      </Button>

      {extractedTasks.length > 0 && (
        <TaskConfirmationDialog
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          tasks={extractedTasks}
          onConfirm={(tasks) => createMutation.mutate(tasks)}
        />
      )}
    </div>
  );
}