import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import CalendarView from "@/components/calendar-view";
import TaskList from "@/components/task-list";
import TaskInput from "@/components/task-input";
import { Task } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user, loading } = useAuth();
  const { data: tasks = [], refetch } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !!user
  });

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Welcome, {user.email}</h1>
          <Button onClick={() => window.location.href = "/api/auth/logout"}>
            Sign Out
          </Button>
        </div>

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