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
import { useEffect, useState } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logout } from '@/utils/google-utils';

interface Task {
  id: number;
  title: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Welcome, {user.email}</h1>
        <Button onClick={logout}>Sign Out</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p>No tasks found. Try adding some!</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="p-4 border rounded">
                  <h3 className="font-semibold">{task.title}</h3>
                  {task.description && <p className="text-gray-600">{task.description}</p>}
                  {task.scheduledStart && (
                    <p className="text-sm text-gray-500">
                      {new Date(task.scheduledStart).toLocaleString()}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
