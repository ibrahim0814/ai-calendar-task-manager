/**
 * Date and time utility functions for formatting and manipulating dates.
 */

import { format, formatISO, parseISO, addDays } from 'date-fns';

/**
 * Formats a time string in HH:MM format to a more readable format
 * @param timeString Time string in HH:MM format
 * @returns Formatted time string (e.g., "3:30 PM")
 */
export function formatTime(timeString: string): string {
  // Parse the HH:MM format
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Format hours for 12-hour clock
  const hour12 = hours % 12 || 12;
  const period = hours >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format date string for display
 * @param dateString Date string or ISO string
 * @returns Formatted date string 
 */
export function formatDate(dateString: string): string {
  // If it's in HH:MM format (for start times), format as time
  if (/^\d{2}:\d{2}$/.test(dateString)) {
    return formatTime(dateString);
  }
  
  // Otherwise assume it's an ISO date
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'PPp'); // Format like "Mar 20, 2023, 3:00 PM"
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString; // Return original string if parsing fails
  }
}

/**
 * Format a duration in minutes to a human-readable format
 * @param minutes Duration in minutes
 * @returns Formatted duration string (e.g., "1 hour 30 minutes")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Get formatted string for tomorrow's date
 * @returns String representing tomorrow's date in "MMM d" format (e.g., "Mar 15")
 */
export function getTomorrowDateString(): string {
  const tomorrow = addDays(new Date(), 1);
  return format(tomorrow, 'MMM d');
}

/**
 * Get formatted string for today's date
 * @returns String representing today's date in "MMM d" format (e.g., "Mar 14")
 */
export function getTodayDateString(): string {
  return format(new Date(), 'MMM d');
}

/**
 * Format a Date object to a short readable format
 * @param date Date object
 * @returns Formatted date string (e.g., "Mar 14")
 */
export function formatShortDate(date: Date): string {
  return format(date, 'MMM d');
}