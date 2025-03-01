import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import CalendarView from "@/components/calendar-view";
import DayView from "@/components/day-view";
import TaskInput from "@/components/task-input";
import { Task } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Welcome, {user.email}</h1>
          <div className="flex gap-4">
            <Button 
              onClick={() => window.location.href = "/api/auth/logout"}
              variant="outline"
            >
              Sign Out
            </Button>
            <Button onClick={() => window.location.href = "#"} >
              <Plus className="h-4 w-4 mr-2" />
              Add Tasks
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Sidebar - Day View (30%) */}
          <div className="w-[30%] bg-card rounded-lg p-4 shadow-sm">
            <DayView tasks={tasks} />
          </div>

          {/* Main Content - Calendar View (70%) */}
          <div className="w-[70%] bg-card rounded-lg p-4 shadow-sm">
            <CalendarView tasks={tasks} />
          </div>
        </div>
      </div>
    </div>
  );
}