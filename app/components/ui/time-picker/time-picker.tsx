"use client"

import React from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../select";
import { Label } from "../label";
import { cn } from "../../../lib/utils";

interface TimePickerProps {
  value?: string; // "HH:MM" in 24h format
  onChange?: (value: string) => void;
  className?: string;
}

export function TimePicker({ value = "09:00", onChange, className }: TimePickerProps) {
  // Parse the current value with validation
  let hours = 9;
  let minutes = 0;
  
  try {
    if (value) {
      // Support both HH:MM and H:MM formats
      if (/^\d{1,2}:\d{2}$/.test(value)) {
        [hours, minutes] = value.split(":").map(Number);
      } 
      // Try to parse other time formats as fallback
      else {
        const now = new Date();
        now.setHours(9, 0, 0, 0); // Default to 9:00 AM
        
        try {
          // Try to create a date object and extract hours and minutes
          const date = new Date(`2025-01-01T${value}`);
          if (!isNaN(date.getTime())) {
            hours = date.getHours();
            minutes = date.getMinutes();
          }
        } catch (parseError) {
          console.warn("Could not parse time, using default 9:00 AM");
        }
      }
      
      // Validate hours and minutes are in range
      hours = Math.min(Math.max(0, hours), 23);
      minutes = Math.min(Math.max(0, minutes), 59);
    }
  } catch (error) {
    console.error("Error parsing time:", error);
  }
  
  // Format hours for display (12-hour format)
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  
  // Handle hour change
  const handleHourChange = (newHour: string) => {
    const hourNum = parseInt(newHour, 10);
    // Convert 12-hour format to 24-hour format
    const newHours = hourNum === 12 
      ? (ampm === "AM" ? 0 : 12) 
      : (ampm === "PM" ? hourNum + 12 : hourNum);
    
    onChange?.(`${newHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
  };
  
  // Handle minute change
  const handleMinuteChange = (newMinute: string) => {
    const minuteNum = parseInt(newMinute, 10);
    onChange?.(`${hours.toString().padStart(2, "0")}:${minuteNum.toString().padStart(2, "0")}`);
  };
  
  // Handle AM/PM change
  const handleAmPmChange = (newAmPm: string) => {
    let newHours = hours;
    if (newAmPm === "AM" && hours >= 12) {
      newHours = hours - 12;
    } else if (newAmPm === "PM" && hours < 12) {
      newHours = hours + 12;
    }
    
    onChange?.(`${newHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
  };
  
  return (
    <div className={cn("flex space-x-1", className)}>
      {/* Hour Select */}
      <Select 
        value={displayHour.toString()} 
        onValueChange={handleHourChange}
      >
        <SelectTrigger className="flex-1 h-9 bg-slate-800/80 border-slate-700 text-white text-sm">
          <SelectValue placeholder="Hour" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-white z-[9999]">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
            <SelectItem 
              key={hour} 
              value={hour.toString()}
              className="hover:bg-slate-700"
            >
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Minute Select */}
      <Select 
        value={minutes.toString().padStart(2, "0")} 
        onValueChange={handleMinuteChange}
      >
        <SelectTrigger className="flex-1 h-9 bg-slate-800/80 border-slate-700 text-white text-sm">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-white z-[9999]">
          {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
            <SelectItem 
              key={minute} 
              value={minute.toString().padStart(2, "0")}
              className="hover:bg-slate-700"
            >
              {minute.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* AM/PM Select */}
      <Select 
        value={ampm} 
        onValueChange={handleAmPmChange}
      >
        <SelectTrigger className="w-16 h-9 bg-slate-800/80 border-slate-700 text-white text-sm">
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-white z-[9999]">
          <SelectItem value="AM" className="hover:bg-slate-700">AM</SelectItem>
          <SelectItem value="PM" className="hover:bg-slate-700">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}