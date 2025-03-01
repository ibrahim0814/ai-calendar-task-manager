import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CalendarView from "@/components/calendar-view";
import TaskList from "@/components/task-list";
import TaskInput from "@/components/task-input";
import { Task } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const { data: tasks = [], refetch } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        <TaskInput onTasksCreated={refetch} />
        
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar">
            <CalendarView tasks={tasks} />
          </TabsContent>
          
          <TabsContent value="tasks">
            <TaskList tasks={tasks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
