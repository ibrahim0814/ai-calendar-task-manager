import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface TaskInputProps {
  onTasksCreated: () => void;
}

export default function TaskInput({ onTasksCreated }: TaskInputProps) {
  const [text, setText] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/tasks/process", { text });
      return res.json();
    },
    onSuccess: () => {
      setText("");
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
        onClick={() => mutation.mutate(text)}
        disabled={mutation.isPending || !text.trim()}
        className="w-full"
      >
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Process Tasks
      </Button>
    </div>
  );
}
