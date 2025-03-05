"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, parse } from "date-fns";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ScrollArea, ScrollBar } from "./scroll-area";

interface DateTimePickerProps {
  value?: string; // in 24h format "HH:MM"
  onChange?: (value: string) => void;
  className?: string;
  showDate?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  className,
  showDate = false,
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (value) {
      const [hours, minutes] = value.split(":").map(Number);
      const now = new Date();
      now.setHours(hours);
      now.setMinutes(minutes);
      return now;
    }
    return undefined;
  });
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Make sure picker closes when component values change and on unmount
  React.useEffect(() => {
    setIsOpen(false);
    
    return () => {
      setIsOpen(false);
    };
  }, [value]);
  
  // Close all other date pickers when this one opens
  React.useEffect(() => {
    if (isOpen) {
      // Close any task calendars
      Object.keys(document.body.dataset)
        .filter(key => key.startsWith("task-date-open-"))
        .forEach(key => {
          document.body.dataset[key] = "false";
        });
    }
  }, [isOpen]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && date) {
      const newDate = new Date(selectedDate);
      newDate.setHours(date.getHours());
      newDate.setMinutes(date.getMinutes());
      setDate(newDate);
      updateTimeValue(newDate);
    } else if (selectedDate) {
      setDate(selectedDate);
      updateTimeValue(selectedDate);
    }
  };

  const handleTimeChange = (
    type: "hour" | "minute" | "ampm",
    value: string
  ) => {
    if (date) {
      const newDate = new Date(date);
      if (type === "hour") {
        newDate.setHours(
          (parseInt(value) % 12) + (newDate.getHours() >= 12 ? 12 : 0)
        );
      } else if (type === "minute") {
        newDate.setMinutes(parseInt(value));
      } else if (type === "ampm") {
        const currentHours = newDate.getHours();
        const isPM = value === "PM";
        if (isPM && currentHours < 12) {
          newDate.setHours(currentHours + 12);
        } else if (!isPM && currentHours >= 12) {
          newDate.setHours(currentHours - 12);
        }
      }
      setDate(newDate);
      updateTimeValue(newDate);
    }
  };

  const updateTimeValue = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    onChange?.(`${hours}:${minutes}`);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          {showDate ? (
            <CalendarIcon className="mr-2 h-4 w-4" />
          ) : (
            <Clock className="mr-2 h-4 w-4" />
          )}
          {date ? (
            showDate ? (
              format(date, "MM/dd/yyyy hh:mm aa")
            ) : (
              format(date, "hh:mm aa")
            )
          ) : (
            <span>{showDate ? "MM/DD/YYYY hh:mm aa" : "hh:mm aa"}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" style={{ zIndex: 999 }}>
        <div className="sm:flex">
          {showDate && (
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
            />
          )}
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x divide-slate-700">
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    type="button"
                    size="icon"
                    variant={
                      date && date.getHours() % 12 === hour % 12
                        ? "default"
                        : "ghost"
                    }
                    className="sm:w-full shrink-0 aspect-square text-white hover:bg-slate-700"
                    onClick={() => handleTimeChange("hour", hour.toString())}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                  <Button
                    key={minute}
                    type="button"
                    size="icon"
                    variant={
                      date && date.getMinutes() === minute ? "default" : "ghost"
                    }
                    className="sm:w-full shrink-0 aspect-square text-white hover:bg-slate-700"
                    onClick={() =>
                      handleTimeChange("minute", minute.toString())
                    }
                  >
                    {minute.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="">
              <div className="flex sm:flex-col p-2">
                {["AM", "PM"].map((ampm) => (
                  <Button
                    key={ampm}
                    type="button"
                    size="icon"
                    variant={
                      date &&
                      ((ampm === "AM" && date.getHours() < 12) ||
                        (ampm === "PM" && date.getHours() >= 12))
                        ? "default"
                        : "ghost"
                    }
                    className="sm:w-full shrink-0 aspect-square text-white hover:bg-slate-700"
                    onClick={() => handleTimeChange("ampm", ampm)}
                  >
                    {ampm}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
