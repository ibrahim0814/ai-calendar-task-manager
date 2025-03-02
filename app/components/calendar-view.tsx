import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Task } from "@shared/schema";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarViewProps {
  tasks: Task[];
}

export default function CalendarView({ tasks }: CalendarViewProps) {
  const events = tasks.map((task) => ({
    title: task.title,
    start: new Date(task.scheduledStart!),
    end: new Date(task.scheduledEnd!),
  }));

  return (
    <div className="h-[600px] mt-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
      />
    </div>
  );
}