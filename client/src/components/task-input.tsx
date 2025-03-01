import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
      return res.json();
    },
    onSuccess: (tasks: TaskExtract[]) => {
      setExtractedTasks(tasks);
      setShowConfirmation(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to extract tasks: " + error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { tasks: TaskExtract[] }) => {
      const res = await apiRequest("POST", "/api/tasks/process", data);
      return res.json();
    },
    onSuccess: () => {
      setText("");
      setShowConfirmation(false);
      onTasksCreated();
      toast({
        title: "Tasks created",
        description: "Your tasks have been scheduled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process tasks: " + error.message,
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

      <TaskConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        tasks={extractedTasks}
        onConfirm={(data) => createMutation.mutate(data)}
      />
    </div>
  );
}