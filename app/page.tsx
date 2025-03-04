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
  List,
} from "lucide-react";
import { useAuth } from "./providers/auth-provider";
import { useIsMobile } from "./hooks/use-mobile";
import { signOut } from "next-auth/react";
import { Task, TaskExtract } from "@/lib/types";
import { addDays, isSameDay, getDaysInMonth, differenceInDays, endOfMonth, endOfYear } from "date-fns";
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
import { format } from "date-fns";
import { createPacificTimeDate } from "../lib/utils";
import Image from "next/image";

function HomePage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar'>('tasks');
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
  
  // Calculate days left in month and year
  const { daysLeftInMonth, daysLeftInYear } = useMemo(() => {
    const today = new Date();
    const monthEnd = endOfMonth(today);
    const yearEnd = endOfYear(today);
    
    return {
      daysLeftInMonth: differenceInDays(monthEnd, today) + 1, // Include today
      daysLeftInYear: differenceInDays(yearEnd, today) + 1    // Include today
    };
  }, []);

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
  
  // When a date is selected on the calendar view, switch to the tasks tab on mobile
  useEffect(() => {
    if (isMobile && selectedDate) {
      setActiveTab('tasks');
    }
  }, [selectedDate, isMobile]);

  // Handle month change from calendar
  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };
  
  // Handle tab change
  const handleTabChange = (tab: 'tasks' | 'calendar') => {
    setActiveTab(tab);
  };

  // Handle create task
  const handleCreateTask = async (task: Omit<Task, "id">) => {
    // Store original overflow value to restore it later
    const originalOverflow = document.body.style.overflow;

    try {
      console.log("Creating task:", task);
      setLoading(true);

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      const createdTask = await response.json();
      console.log("Task created successfully:", createdTask);

      // Update the tasks list with the newly created task
      setTasks((prevTasks) => [...prevTasks, createdTask]);

      // Close the modal
      setIsModalOpen(false);
      setTaskToEdit(null);

      // Refresh the tasks for the current month
      await fetchTasksForMonth(currentMonth, currentYear);

      return createdTask;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    } finally {
      // Use a small timeout to ensure UI updates properly before enabling interaction
      setTimeout(() => {
        setLoading(false);
        // Restore original overflow setting
        document.body.style.overflow = originalOverflow;
        console.log("UI fully restored after task creation");
      }, 100);
    }
  };

  // This function is no longer needed since we're using createPacificTimeDate
  // Keeping a simplified version for backward compatibility
  const fixTimezoneOffset = (dateString: string) => {
    const date = new Date(dateString);
    return date;
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

  // Handle edit task functionality - now using natural language instead of modal
  const handleEditTask = (taskId: string) => {
    const taskToEdit = tasks.find((t) => t.id === taskId);
    if (taskToEdit) {
      setTaskToEdit(taskToEdit);
      // Open natural language modal instead of manual modal
      setIsNaturalLanguageModalOpen(true);
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
    return addDays(date, 1);
  };

  // Handle creating a task from natural language
  const handleCreateTaskFromNL = useCallback(
    async (task: TaskExtract) => {
      console.log("Creating task from natural language extract:", task);

      try {
        // Apply the selected date to the task if provided
        const taskDate = task.date || new Date();

        // Create dates based on the scheduled date and the provided time
        const [hours, minutes] = task.startTime.split(":").map(Number);
        const taskStartDate = new Date(taskDate);
        taskStartDate.setHours(hours, minutes, 0, 0);

        const taskEndDate = new Date(taskStartDate);
        taskEndDate.setMinutes(taskStartDate.getMinutes() + task.duration);

        console.log(
          `Creating task: ${task.title}, date: ${taskDate.toISOString()}`
        );
        console.log(
          `Start time: ${taskStartDate.toISOString()}, end time: ${taskEndDate.toISOString()}`
        );

        const newTask = {
          title: task.title,
          description: task.description || "",
          startTime: taskStartDate.toISOString(),
          endTime: taskEndDate.toISOString(),
          priority: task.priority || "medium",
          date: taskDate.toISOString().split("T")[0], // Store just the date part
        };

        console.log("Prepared task:", newTask);

        // Call API directly instead of using handleCreateTask
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newTask),
        });

        if (!response.ok) {
          throw new Error("Failed to create task");
        }

        const createdTask = await response.json();
        console.log("Task created successfully:", createdTask);

        // Update the tasks list with the newly created task
        setTasks((prevTasks) => [...prevTasks, createdTask]);

        console.log("Task successfully created from natural language input");
        return createdTask;
      } catch (error) {
        console.error("Error creating task from natural language:", error);
        throw error;
      }
    },
    [setTasks]
  );

  // Handle tasks from natural language extraction
  const handleCreateTasksFromExtract = useCallback(
    async (extractedTasks: TaskExtract[]) => {
      console.log("Creating multiple tasks from extraction:", extractedTasks);

      // Store original overflow value to restore it later
      const originalOverflow = document.body.style.overflow;

      // Start loading
      setLoading(true);

      try {
        // Create array of promises to create all tasks in parallel
        const taskPromises = extractedTasks.map((task) =>
          handleCreateTaskFromNL(task).catch((err) => {
            console.error(`Failed to create task: ${task.title}`, err);
            return null;
          })
        );

        // Wait for all tasks to be created
        const results = await Promise.all(taskPromises);
        const createdTasks = results.filter(Boolean);

        console.log(
          `Successfully created ${createdTasks.length} tasks from extracted data`
        );

        // Refresh tasks for the current month
        await fetchTasksForMonth(currentMonth, currentYear);
      } catch (error) {
        console.error("Error creating tasks from extraction:", error);
      } finally {
        // Use a small timeout to ensure UI updates properly before enabling interaction
        setTimeout(() => {
          setLoading(false);
          // Re-enable scrolling
          document.body.style.overflow = originalOverflow;
          console.log("UI fully restored after natural language task creation");

          // Close the natural language modal - moved to finally block to ensure cleanup
          setIsNaturalLanguageModalOpen(false);
        }, 100);
      }
    },
    [
      handleCreateTaskFromNL,
      setIsNaturalLanguageModalOpen,
      fetchTasksForMonth,
      currentMonth,
      currentYear,
    ]
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="border-b border-slate-800">
          <div className="flex items-center justify-between w-full px-4 py-4">
            <h1 className="text-xl font-bold flex items-center">
              Smart Scheduler <CalendarDays className="ml-2 h-5 w-5" />
            </h1>

            <div className="flex items-center">
              <Button
                size="sm"
                variant="default"
                className="flex items-center gap-1"
                onClick={() => setIsNaturalLanguageModalOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden md:inline">Add Tasks</span>
              </Button>

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

        <main className={`p-4 ${isMobile ? 'mobile-container' : 'flex flex-col md:flex-row h-[calc(100vh-74px)] overflow-hidden'}`}>
          {/* Conditionally render layout based on mobile/desktop */}
          {isMobile ? (
            /* Mobile Layout - Tabbed interface */
            <>
              {/* Date Display - Above tabs */}
              <div className="w-full date-banner">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{format(new Date(), "EEEE, MMMM d")}</h2>
                    <p className="text-sm text-slate-400">{format(new Date(), "yyyy")}</p>
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <div className="days-counter counter-month">
                      <span className="text-blue-400 font-bold">{daysLeftInMonth}</span>
                      <span className="text-slate-400 mt-0.5">days left</span>
                      <span className="text-slate-400 text-[10px] mt-0.5">in month</span>
                    </div>
                    <div className="days-counter counter-year">
                      <span className="text-purple-400 font-bold">{daysLeftInYear}</span>
                      <span className="text-slate-400 mt-0.5">days left</span>
                      <span className="text-slate-400 text-[10px] mt-0.5">in year</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tab buttons */}
              <div className="flex w-full mb-4 border-b border-slate-800">
                <button 
                  onClick={() => handleTabChange('tasks')}
                  className={`flex items-center gap-2 px-4 py-2 w-1/2 justify-center ${activeTab === 'tasks' ? 'border-b-2 border-blue-400 text-blue-400 font-medium' : 'text-slate-400'}`}
                >
                  <List className="h-4 w-4" />
                  <span>Tasks</span>
                </button>
                <button 
                  onClick={() => handleTabChange('calendar')}
                  className={`flex items-center gap-2 px-4 py-2 w-1/2 justify-center ${activeTab === 'calendar' ? 'border-b-2 border-blue-400 text-blue-400 font-medium' : 'text-slate-400'}`}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Calendar</span>
                </button>
              </div>
              
              {/* Content based on active tab */}
              <div className="w-full flex-1 h-[calc(100vh-200px)] overflow-hidden">
                {activeTab === 'tasks' ? (
                  /* Tasks Tab */
                  <div className="h-full flex flex-col task-tab-content">
                    <div className="flex justify-between items-center mb-3">
                      {/* Removed "Today's Tasks" heading */}
                    </div>
                    
                    <div className="flex-1 rounded-md p-3 bg-slate-900/50">
                      <TaskList
                        tasks={tasksForSelectedDate}
                        onDeleteTask={handleDeleteTask}
                        onEditTask={handleEditTask}
                        onViewTask={handleViewTaskDetails}
                        isLoading={loading}
                      />
                    </div>
                  </div>
                ) : (
                  /* Calendar Tab */
                  <div className="h-full calendar-tab-content">
                    <CalendarView
                      tasks={tasks}
                      onDateSelect={(date) => {
                        setSelectedDate(date);
                        // When selecting a date on mobile, switch to tasks tab
                        setActiveTab('tasks');
                      }}
                      selectedDate={selectedDate}
                      onMonthChange={handleMonthChange}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Desktop Layout - Calendar on left, Tasks on right */
            <>
              <div className="w-full md:w-2/3 mb-6 md:mb-0 md:pr-4 h-full flex flex-col">
                <CalendarView
                  tasks={tasks}
                  onDateSelect={setSelectedDate}
                  selectedDate={selectedDate}
                  onMonthChange={handleMonthChange}
                />
              </div>

              <div className="w-full md:w-1/3 md:border-l md:border-slate-800 md:pl-4 h-full overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">{formattedDate}</h2>
                  <div className="flex gap-3 flex-shrink-0 hidden md:flex">
                    <div className="days-counter counter-month">
                      <span className="text-blue-400 font-bold">{daysLeftInMonth}</span>
                      <span className="text-slate-400 mt-0.5">days left</span>
                      <span className="text-slate-400 text-[10px] mt-0.5">in month</span>
                    </div>
                    <div className="days-counter counter-year">
                      <span className="text-purple-400 font-bold">{daysLeftInYear}</span>
                      <span className="text-slate-400 mt-0.5">days left</span>
                      <span className="text-slate-400 text-[10px] mt-0.5">in year</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-y-auto h-full">
                  <TaskList
                    tasks={tasksForSelectedDate}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={handleEditTask}
                    onViewTask={handleViewTaskDetails}
                    isLoading={loading}
                  />
                </div>
              </div>
            </>
          )}
        </main>

        {/* Task Modal */}

        {/* Natural Language Modal */}
        {isNaturalLanguageModalOpen && (
          <NaturalLanguageModal
            onClose={() => {
              setIsNaturalLanguageModalOpen(false);
              setTaskToEdit(null);
            }}
            onCreateTasks={handleCreateTasksFromExtract}
            taskToEdit={taskToEdit}
          />
        )}

        {/* Task Details Modal */}
        {viewTaskDetails && (
          <TaskDetailsModal
            task={viewTaskDetails}
            onClose={() => setViewTaskDetails(null)}
            onDelete={() => handleDeleteTask(viewTaskDetails.id)}
            onEdit={() => handleEditTask(viewTaskDetails.id)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

export default HomePage;
