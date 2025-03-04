import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
}

/**
 * Creates a date in Pacific time regardless of the user's local timezone
 * @param hours Hours in 24-hour format (0-23)
 * @param minutes Minutes (0-59)
 * @param date Optional date to set time for, defaults to today
 * @returns Date object with the specified time in Pacific Time (America/Los_Angeles)
 */
export function createPacificTimeDate(hours: number, minutes: number, date?: Date): Date {
  // Use the provided date or today
  const baseDate = date || new Date();
  
  // Extract the date components
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  
  // We need to create a date that's explicitly in Pacific Time
  // First, create the date in UTC to avoid local timezone effects
  const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, 0));
  
  // Adjust for Pacific Time (UTC-8 for PST, UTC-7 for PDT)
  // This simplified approach doesn't handle daylight saving time changes precisely
  // For production, you might want to use a library like date-fns-tz
  const pacificTimeOffsetHours = 8; // PST is UTC-8
  const pacificDate = new Date(utcDate.getTime() - pacificTimeOffsetHours * 60 * 60 * 1000);
  
  return pacificDate;
}
