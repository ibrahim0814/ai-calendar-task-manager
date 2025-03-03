"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "./components/ui/button";
import TaskList from "./components/task-list";
import CalendarView from "./components/calendar-view";
import {
  Plus,
  LogOut,
  CalendarDays,
  Trash,
  Edit,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "./providers/auth-provider";
import { signOut } from "next-auth/react";
import { Task, TaskExtract } from "@/lib/types";
import ProtectedRoute from "./components/protected-route";
import TaskModal from "./components/task-modal";
import TaskDetailsModal from "./components/task-details-modal";
import NaturalLanguageModal from "./components/natural-language-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { format, addHours } from "date-fns";
import Image from "next/image";

function HomePage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNaturalLanguageModalOpen, setIsNaturalLanguageModalOpen] =
    useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [viewTaskDetails, setViewTaskDetails] = useState<Task | null>(null);

  // Format date to display
  const formattedDate = useMemo(
    () =>
      selectedDate
        ? format(selectedDate, "EEEE, MMMM d, yyyy")
        : format(new Date(), "EEEE, MMMM d, yyyy"),
    [selectedDate]
  );

  // Filter tasks for the selected date
  const tasksForSelectedDate = useMemo(() => {
    if (!selectedDate || !tasks.length) return [];

    return tasks.filter((task) => {
      if (!task.startTime) return false;

      const taskDate = new Date(task.startTime);
      return (
        taskDate.getDate() === selectedDate.getDate() &&
        taskDate.getMonth() === selectedDate.getMonth() &&
        taskDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [selectedDate, tasks]);

  // Fetch tasks for the current month
  const fetchTasksForMonth = useCallback(
    async (month: number, year: number) => {
      setLoading(true);
      try {
        // Only fetch if user is authenticated
        if (!user) {
          setTasks([]);
          return;
        }

        const res = await fetch(`/api/tasks?month=${month}&year=${year}`);

        if (!res.ok) {
          throw new Error(`Error fetching tasks: ${res.status}`);
        }

        const data = await res.json();

        // Apply timezone correction to each task's times
        const tasksWithCorrectedTime = data.map((task: Task) => ({
          ...task,
          startTime: task.startTime
            ? new Date(task.startTime).toISOString()
            : undefined,
          endTime: task.endTime
            ? new Date(task.endTime).toISOString()
            : undefined,
        }));

        setTasks(tasksWithCorrectedTime);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Update when the component mounts or month changes or user changes
  useEffect(() => {
    if (user) {
      fetchTasksForMonth(currentMonth, currentYear);
    }
  }, [currentMonth, currentYear, user, fetchTasksForMonth]);

  // Handle month change from calendar
  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);

    // Set the selected date to the first day of the new month
    const firstDayOfMonth = new Date(year, month, 1);
    setSelectedDate(firstDayOfMonth);
  };

  // Handle creating or editing a task
  const handleProcessTasks = useCallback(
    async (task: any) => {
      console.log("--------- PROCESSING INDIVIDUAL TASK ---------");
      console.log("Task data for creation/update:", JSON.stringify(task));

      setLoading(true);

      // Store original overflow value to restore it later
      const originalOverflow = document.body.style.overflow;
      
      // Prevent scrolling issues during task creation
      document.body.style.overflow = "hidden";

      try {
        console.log("Sending request to /api/tasks endpoint");
        const isEditing = !!task.id;

        const endpoint = isEditing ? `/api/tasks?id=${task.id}` : "/api/tasks";

        const method = isEditing ? "PUT" : "POST";

        console.log(`Sending ${method} request to ${endpoint}`);
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(task),
        });

        console.log("API response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API error response:", JSON.stringify(errorData));
          throw new Error("Failed to process task");
        }

        const responseData = await response.json().catch(() => ({}));
        console.log("Task created successfully:", JSON.stringify(responseData));

        // Refresh tasks after creation/editing
        console.log("Refreshing tasks for month");
        await fetchTasksForMonth(currentMonth, currentYear);
        
        console.log("Tasks refreshed successfully, re-enabling UI");
      } catch (error) {
        console.error("Error processing task:", error);
      } finally {
        console.log("Task processing completed, resetting UI state");
        
        // Use a small timeout to ensure UI updates properly before enabling interaction
        setTimeout(() => {
          setLoading(false);
          // Re-enable scrolling
          document.body.style.overflow = originalOverflow;
          console.log("UI fully restored");
        }, 100);
      }
    },
    [currentMonth, currentYear, fetchTasksForMonth]
  );

  // Fix timezone offset issue
  const fixTimezoneOffset = (dateString: string) => {
    const date = new Date(dateString);
    // Add 8 hours to correct PST timezone
    return addHours(date, 8);
  };

  // Function to delete a task that syncs with Google Calendar
  const handleDeleteTask = async (taskId: string) => {
    console.log(`Deleting task with ID: ${taskId}`);
    try {
      // Call the API to delete the task from Google Calendar
      const res = await fetch(`/api/tasks?eventId=${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error deleting task:", errorData);
        throw new Error(errorData.error || "Failed to delete task");
      }

      console.log("Task successfully deleted");
      // Update the UI by removing the task from state
      setTasks(tasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Handle edit task functionality
  const handleEditTask = (taskId: string) => {
    const taskToEdit = tasks.find((t) => t.id === taskId);
    if (taskToEdit) {
      setTaskToEdit(taskToEdit);
      setIsModalOpen(true);
    }
  };

  // Handle viewing task details
  const handleViewTaskDetails = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setViewTaskDetails(task);
    }
  };

  const defaultEndTime = (date: Date) => {
    return addHours(date, 1);
  };

  // Handle creating a task from natural language
  const handleCreateTaskFromNL = useCallback(
    async (task: TaskExtract) => {
      console.log("Creating task from natural language extract:", task);

      // Start loading state
      setLoading(true);

      try {
        // Calculate start and end times from startTime string and duration
        const [hours, minutes] = task.startTime.split(":").map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + task.duration);

        // Fix timezone offsets
        const fixedStartTime = fixTimezoneOffset(startDate.toISOString());
        const fixedEndTime = fixTimezoneOffset(endDate.toISOString());

        const newTask = {
          title: task.title,
          description: task.description || "",
          startTime: fixedStartTime.toISOString(),
          endTime: fixedEndTime.toISOString(),
          priority: task.priority || "medium",
        };

        console.log("Prepared task with fixed times:", newTask);

        // Create the task
        await handleProcessTasks(newTask);

        console.log("Task successfully created from natural language input");
      } catch (error) {
        console.error("Error creating task from natural language:", error);
        // Don't set loading to false here, as handleProcessTasks will handle that
      }
    },
    [fixTimezoneOffset, handleProcessTasks]
  );

  // Handle tasks from natural language extraction
  const handleCreateTasksFromExtract = useCallback(
    async (extractedTasks: TaskExtract[]) => {
      console.log("Creating multiple tasks from extraction:", extractedTasks);

      // Store original overflow value to restore it later
      const originalOverflow = document.body.style.overflow;
      
      // Prevent scrolling issues
      document.body.style.overflow = "hidden";
      
      // Start loading
      setLoading(true);

      try {
        // Process each task sequentially
        for (const task of extractedTasks) {
          await handleCreateTaskFromNL(task);
        }

        console.log(
          `Successfully created ${extractedTasks.length} tasks from extracted data`
        );

        // Close the natural language modal
        setIsNaturalLanguageModalOpen(false);
      } catch (error) {
        console.error("Error creating tasks from extraction:", error);
      } finally {
        // Use a small timeout to ensure UI updates properly before enabling interaction
        setTimeout(() => {
          setLoading(false);
          // Re-enable scrolling
          document.body.style.overflow = originalOverflow;
          console.log("UI fully restored after natural language task creation");
        }, 100);
      }
    },
    [handleCreateTaskFromNL, setIsNaturalLanguageModalOpen]
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="border-b border-slate-800">
          <div className="flex items-center justify-between w-full px-4 py-4">
            <h1 className="text-xl font-bold flex items-center">
              Smart Scheduler <CalendarDays className="ml-2 h-5 w-5" />
            </h1>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden md:inline">Add Tasks</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setIsNaturalLanguageModalOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <span>Natural Language</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    <span>Manual Entry</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 p-1 h-9 ml-2"
                  >
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || "User"}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
                        {user?.name?.[0] || "U"}
                      </div>
                    )}
                    <span className="hidden md:inline">{user?.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={async () => {
                      // Disable the UI immediately to prevent further interactions
                      setLoading(true);

                      try {
                        // Call signOut with callbackUrl to ensure proper redirect
                        await signOut({
                          callbackUrl: "/auth",
                          redirect: true,
                        });
                      } catch (error) {
                        console.error("Logout failed", error);
                        // Fallback: force redirect if signOut fails
                        window.location.href = "/auth";
                      }
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-4 flex flex-col md:flex-row h-[calc(100vh-74px)] overflow-hidden">
          <div className="w-full md:w-2/3 mb-6 md:mb-0 md:pr-4 h-full flex flex-col">
            <CalendarView
              tasks={tasks}
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
              onMonthChange={handleMonthChange}
            />
          </div>

          <div className="w-full md:w-1/3 md:pl-4 h-full flex flex-col">
            <div className="bg-slate-900 rounded-lg p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-slate-200">Tasks</h2>
                <span className="text-sm text-slate-400">{formattedDate}</span>
              </div>

              <div className="overflow-y-auto flex-grow">
                {loading ? (
                  <div className="flex justify-center my-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : tasksForSelectedDate.length > 0 ? (
                  <TaskList
                    tasks={tasksForSelectedDate}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={handleEditTask}
                    onViewTask={handleViewTaskDetails}
                  />
                ) : (
                  <div className="text-gray-500 text-center my-8">
                    No tasks scheduled for this day
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Natural Language Modal */}
        {isNaturalLanguageModalOpen && (
          <NaturalLanguageModal
            onClose={() => {
              console.log("Closing natural language modal");
              setIsNaturalLanguageModalOpen(false);
            }}
            onCreateTasks={handleCreateTasksFromExtract}
          />
        )}

        {/* Task Create/Edit Modal */}
        {isModalOpen && (
          <TaskModal
            onClose={() => {
              console.log("Closing task modal");
              setIsModalOpen(false);
              setTaskToEdit(null);
            }}
            onCreateTask={handleProcessTasks}
            taskToEdit={taskToEdit}
          />
        )}

        {viewTaskDetails && (
          <TaskDetailsModal
            task={viewTaskDetails}
            onClose={() => setViewTaskDetails(null)}
            onEdit={() => {
              setTaskToEdit(viewTaskDetails);
              setViewTaskDetails(null);
              setIsModalOpen(true);
            }}
            onDelete={() => {
              handleDeleteTask(viewTaskDetails.id);
              setViewTaskDetails(null);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

export default HomePage;
