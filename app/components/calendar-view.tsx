"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Button } from "./ui/button";
import { Task } from "../../lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarViewProps {
  tasks: Task[];
  selectedDate?: Date | null;
  onDateSelect?: (date: Date) => void;
  onMonthChange?: (month: number, year: number) => void;
}

// Memoized day component to prevent unnecessary re-renders
const CalendarDay = memo(
  ({
    day,
    index,
    selectedDate,
    onDateSelect,
    isTodayDate,
    dayTasks,
    formatTime,
  }: {
    day: { date: Date; isCurrentMonth: boolean };
    index: number;
    selectedDate: Date | null;
    onDateSelect?: (date: Date) => void;
    isTodayDate: boolean;
    dayTasks: Task[];
    formatTime: (timeString: string) => string;
  }) => {
    const isSelected = selectedDate
      ? day.date.getFullYear() === selectedDate.getFullYear() &&
        day.date.getMonth() === selectedDate.getMonth() &&
        day.date.getDate() === selectedDate.getDate()
      : false;

    const isLastColumn = (index + 1) % 7 === 0;
    const isLastRow = index >= 35; // Last row (if showing 6 rows)

    // Handle date selection - wrapped in useCallback to prevent recreation on each render
    const handleDateSelect = useCallback(() => {
      if (onDateSelect) onDateSelect(day.date);
    }, [day.date, onDateSelect]);

    return (
      <div
        className={`
        p-1 
        overflow-hidden 
        flex 
        flex-col 
        border-t 
        ${!isLastColumn ? "border-r" : ""} 
        ${isLastRow ? "border-b" : ""}
        border-slate-800
        ${
          day.isCurrentMonth
            ? "bg-transparent"
            : "bg-slate-900 bg-opacity-50 text-slate-500"
        }
        ${isSelected ? "ring-1 ring-blue-500 ring-inset z-10" : ""}
      `}
        onClick={handleDateSelect}
      >
        <div
          className={`text-right p-1 ${
            isTodayDate
              ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center ml-auto"
              : ""
          }`}
        >
          {day.date.getDate()}
        </div>
        <div className="flex-grow overflow-y-auto mt-1 space-y-1 max-h-[60px]">
          {dayTasks.slice(0, 3).map((task, taskIndex) => (
            <div
              key={taskIndex}
              className={`text-xs p-1 rounded truncate ${
                task.priority === "high"
                  ? "bg-red-900"
                  : task.priority === "medium"
                  ? "bg-yellow-900"
                  : "bg-blue-900"
              }`}
              title={task.title}
              onClick={(e) => {
                // Only prevent the event from bubbling up to the day container
                // This allows task clicks but prevents tab switching
                e.stopPropagation();
              }}
            >
              {task.startTime && (
                <span className="mr-1">{formatTime(task.startTime)}</span>
              )}
              {task.title}
            </div>
          ))}
          {dayTasks.length > 3 && (
            <div 
              className="text-xs text-slate-400 p-1"
              onClick={(e) => {
                // Prevent event bubbling to avoid tab switching on task clicks
                e.stopPropagation();
              }}
            >
              +{dayTasks.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  }
);

CalendarDay.displayName = "CalendarDay";

const CalendarView = ({
  tasks,
  selectedDate,
  onDateSelect,
  onMonthChange,
}: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // If selectedDate prop changes, update internal state
  useEffect(() => {
    if (selectedDate) {
      // Keep the calendar month view on the same month as the selected date
      setCurrentDate(new Date(selectedDate));
    }
  }, [selectedDate]);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Memoize current month data to avoid recalculations on every render
  const {
    currentMonth,
    currentYear,
    firstDayOfMonth,
    lastDayOfMonth,
    daysInMonth,
    startingDayOfWeek,
    prevMonth,
    daysInPrevMonth,
  } = useMemo(() => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const prevMonth = new Date(currentYear, currentMonth, 0);
    const daysInPrevMonth = prevMonth.getDate();

    return {
      currentMonth,
      currentYear,
      firstDayOfMonth,
      lastDayOfMonth,
      daysInMonth,
      startingDayOfWeek,
      prevMonth,
      daysInPrevMonth,
    };
  }, [currentDate]);

  // Build calendar grid - memoized to prevent recalculation on every render
  const { calendarDays, weeks } = useMemo(() => {
    const calendarDays: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Add days from previous month
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      calendarDays.push({ date, isCurrentMonth: false });
    }

    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      calendarDays.push({ date, isCurrentMonth: true });
    }

    // Add days from next month to complete the grid (6 weeks max)
    const totalCells = 6 * 7; // 6 rows, 7 days per week
    const remainingCells = totalCells - calendarDays.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      calendarDays.push({ date, isCurrentMonth: false });
    }

    // Group days into weeks
    const weeks: Array<Array<{ date: Date; isCurrentMonth: boolean }>> = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    return { calendarDays, weeks };
  }, [
    currentMonth,
    currentYear,
    daysInMonth,
    daysInPrevMonth,
    startingDayOfWeek,
  ]);

  // Navigation functions - wrapped in useCallback to prevent recreation on each render
  const goToPrevMonth = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);

    // Notify parent component about month change
    if (onMonthChange) {
      onMonthChange(newDate.getMonth(), newDate.getFullYear());
    }
  }, [currentDate, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);

    // Notify parent component about month change
    if (onMonthChange) {
      onMonthChange(newDate.getMonth(), newDate.getFullYear());
    }
  }, [currentDate, onMonthChange]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    if (onDateSelect) {
      onDateSelect(today);
    }

    // Notify parent component about month change
    if (onMonthChange) {
      onMonthChange(today.getMonth(), today.getFullYear());
    }
  }, [onDateSelect, onMonthChange]);

  // Format the month and year for display
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  // Get tasks for a specific date - memoize the function to prevent recreation
  const getTasksForDate = useCallback(
    (date: Date) => {
      return tasks.filter((task) => {
        if (!task.startTime) return false;
        const taskDate = new Date(task.startTime);
        return (
          taskDate.getFullYear() === date.getFullYear() &&
          taskDate.getMonth() === date.getMonth() &&
          taskDate.getDate() === date.getDate()
        );
      });
    },
    [tasks]
  );

  // Format time for display with timezone correction - memoize to prevent recreation
  const formatTime = useCallback((timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  // Check if date is today - memoize to prevent recreation
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {formatMonthYear(currentDate)}
          </h2>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center font-semibold border-b border-slate-700 pb-1">
        {daysOfWeek.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6 gap-0 flex-grow bg-slate-950 border border-slate-800 rounded-md overflow-auto">
        {weeks.flat().map((day, index) => {
          const dayTasks = getTasksForDate(day.date);
          const isTodayDate = isToday(day.date);

          return (
            <CalendarDay
              key={`${day.date.toISOString()}-${index}`}
              day={day}
              index={index}
              selectedDate={selectedDate || null}
              onDateSelect={onDateSelect}
              isTodayDate={isTodayDate}
              dayTasks={dayTasks}
              formatTime={formatTime}
            />
          );
        })}
      </div>
    </div>
  );
};

export default memo(CalendarView);
