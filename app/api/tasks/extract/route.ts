import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { OpenAI } from "openai";
import { z } from "zod";
import { TaskExtract } from "../../../../lib/types";

// Initialize OpenAI with API key if available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Function to round minutes to nearest 15-minute increment
function roundToNearest15Minutes(timeString: string): string {
  try {
    const [hours, minutes] = timeString.split(":").map(Number);
    const roundedMinutes = Math.round(minutes / 15) * 15;

    // Handle case where minutes round to 60
    let adjustedHours = hours;
    let adjustedMinutes = roundedMinutes;

    if (roundedMinutes === 60) {
      adjustedMinutes = 0;
      adjustedHours = (hours + 1) % 24;
    }

    return `${adjustedHours.toString().padStart(2, "0")}:${adjustedMinutes
      .toString()
      .padStart(2, "0")}`;
  } catch (e) {
    console.error("Error rounding time:", e);
    return timeString; // Return original if parsing fails
  }
}

// Task extraction schema - more lenient to ensure extraction never fails
const taskExtractSchema = z.object({
  title: z.string().default("Untitled Task"),
  description: z.string().optional().default(""),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("12:00"),
  duration: z.number().min(15).max(480).default(30),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});

export async function POST(req: NextRequest) {
  console.log("--------- TASK EXTRACTION API CALLED ---------");
  try {
    const session = await auth();
    console.log(
      "Auth session:",
      JSON.stringify({
        userId: session?.user?.id,
        authenticated: !!session?.user,
      })
    );

    if (!session?.user) {
      console.log("Authentication failed - no session or user");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { text } = body;
    console.log("Received text input:", text);

    // Check if OpenAI API key is available
    if (!openai) {
      console.log("OpenAI API key missing");
      return NextResponse.json(
        { error: "OpenAI API key is not available" },
        { status: 500 }
      );
    }

    console.log("Calling OpenAI API with model: gpt-4o");
    // Extract tasks using OpenAI with structured output
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that extracts tasks from user input.
            
            CURRENT DATE/TIME CONTEXT: 
            - Current date: ${new Date().toISOString().split("T")[0]}
            - Current time: ${new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
            - Current timezone: Pacific Time (PT)
            
            Your job is to extract tasks from the user's input text, even if the text is vague or incomplete. 
            ALWAYS extract at least one task from the input, no matter what. Never say the text doesn't contain task information.
            If the input is unclear, create sensible defaults and make reasonable assumptions.
            
            Extract the following information for each task mentioned:
            - title: (REQUIRED) The title of the task
            - startTime: (REQUIRED) The start time in HH:MM format (24h). Please use only 15-minute increments (00, 15, 30, 45)
            - duration: (REQUIRED) The duration in minutes (must be a number between 15 and 480)
            - priority: (REQUIRED) The priority level (must be exactly "high", "medium", or "low")
            - date: (REQUIRED) The date for the task in ISO format (YYYY-MM-DD). 
            
            IMPORTANT INSTRUCTIONS FOR DATE HANDLING:
            - When the user mentions "tomorrow", use ${
              new Date(Date.now() + 86400000).toISOString().split("T")[0]
            }
            - When the user mentions "next week", use ${
              new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
            }
            - When the user mentions "tonight", use today's date: ${
              new Date().toISOString().split("T")[0]
            }
            - Pay careful attention to ANY relative date indicators (tomorrow, next Friday, in two days, etc.)
            - If no specific date is mentioned, default to today's date: ${
              new Date().toISOString().split("T")[0]
            }
            
            ADDITIONAL IMPORTANT NOTES:
            - DO NOT include descriptions in your output. Only extract titles.
            - All fields are REQUIRED. Always include a numeric duration.
            - If duration is not specified, use a reasonable default based on the task type (30-60 minutes).
            - For start times, always round to the nearest 15-minute increment (00, 15, 30, or 45 minutes).
            - Always convert AM/PM times to 24-hour format (e.g., "9pm" becomes "21:00").
            - If the input doesn't specify times, dates, or priorities, use sensible defaults
            - NEVER return an empty response or say the text doesn't match a pattern
            
            Format your response as a JSON object with a "tasks" array containing the extracted tasks.
            For example:
            {
              "tasks": [
                {
                  "title": "Team meeting",
                  "startTime": "09:00",
                  "duration": 60,
                  "priority": "high",
                  "date": "${new Date().toISOString().split("T")[0]}" // today
                },
                {
                  "title": "Doctor appointment",
                  "startTime": "14:30",
                  "duration": 45,
                  "priority": "high",
                  "date": "${
                    new Date(Date.now() + 86400000).toISOString().split("T")[0]
                  }" // tomorrow
                }
              ]
            }`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, // Lower temperature for more predictable output
      });
    } catch (apiError) {
      console.error("OpenAI API error:", apiError);
      // Create a default task when the API call fails
      return NextResponse.json([
        {
          title: "Task from input (API error fallback)",
          startTime: "12:00",
          duration: 30,
          priority: "medium",
          date: new Date(),
        },
      ]);
    }

    const content = completion.choices[0].message.content;
    console.log("OpenAI API response:", content);

    if (!content) {
      console.log("Empty response from OpenAI");
      return NextResponse.json(
        [
          {
            title: "Task from input (empty API response)",
            startTime: "12:00",
            duration: 30,
            priority: "medium",
            date: new Date(),
          },
        ],
        { status: 200 }
      );
    }

    try {
      console.log("Parsing JSON response");
      let parsed;
      try {
        parsed = JSON.parse(content);
        console.log("Parsed response:", JSON.stringify(parsed));
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        // Create a default parsed response
        parsed = {
          tasks: [
            {
              title: "Task from input",
              startTime: "12:00",
              duration: 30,
              priority: "medium",
              date: new Date().toISOString().split("T")[0],
            },
          ],
        };
        console.log("Created default parsed response due to parsing error");
      }

      // Extract tasks array, handling various response formats
      let tasks = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.tasks)
        ? parsed.tasks
        : parsed && typeof parsed === "object"
        ? [parsed]
        : [
            {
              title: "Task from input",
              startTime: "12:00",
              duration: 30,
              priority: "medium",
              date: new Date().toISOString().split("T")[0],
            },
          ];
      console.log("Extracted tasks array:", JSON.stringify(tasks));

      // Process tasks to ensure all required fields have values
      console.log("Processing and applying defaults to tasks");

      // If tasks array is empty, create at least one default task
      if (!tasks || tasks.length === 0) {
        console.log("No tasks found in response, creating default task");
        tasks = [
          {
            title: "Task from text",
            startTime: "12:00",
            duration: 30,
            priority: "medium",
            date: new Date().toISOString().split("T")[0],
          },
        ];
      }

      const processedTasks = tasks.map((task: any, index: number) => {
        console.log(`Processing task ${index}:`, JSON.stringify(task));

        // Parse date with proper handling
        let taskDate: Date;
        if (task.date) {
          try {
            taskDate = new Date(task.date);
            // Check if date is valid
            if (isNaN(taskDate.getTime())) {
              console.warn(
                `Invalid date format for task ${index}: ${task.date}, using today's date instead`
              );
              taskDate = new Date();
            } else {
              console.log(
                `Task ${index} has valid date: ${taskDate.toISOString()}`
              );
            }
          } catch (e) {
            console.warn(`Error parsing date for task ${index}: ${e}`);
            taskDate = new Date();
          }
        } else {
          taskDate = new Date();
        }

        // Process startTime - ensure it's in correct format, fix if not
        let startTime = "12:00"; // Default
        if (typeof task.startTime === "string") {
          // Try to fix common time format issues
          if (/^\d{1,2}:\d{2}$/.test(task.startTime)) {
            // Single-digit hour format like "9:00" - ensure two digits
            const [hours, minutes] = task.startTime.split(":");
            startTime = `${hours.padStart(2, "0")}:${minutes}`;
            console.log(
              `Formatted time from ${task.startTime} to ${startTime}`
            );
          } else if (/^\d{1,2}$/.test(task.startTime)) {
            // Just hour like "9"
            startTime = `${task.startTime.padStart(2, "0")}:00`;
            console.log(
              `Formatted time from ${task.startTime} to ${startTime}`
            );
          } else if (/^\d{4}$/.test(task.startTime)) {
            // Military style without colon like "0900"
            startTime = `${task.startTime.substring(
              0,
              2
            )}:${task.startTime.substring(2, 4)}`;
            console.log(
              `Formatted time from ${task.startTime} to ${startTime}`
            );
          } else {
            console.log(
              `Could not format time ${task.startTime}, using default 12:00`
            );
            startTime = "12:00";
          }

          // Final verification - ensure the format is exactly two digits, colon, two digits
          if (!/^\d{2}:\d{2}$/.test(startTime)) {
            console.warn(
              `Time format still incorrect: ${startTime}, fixing to 12:00`
            );
            startTime = "12:00";
          }
        }

        // Round to nearest 15 minutes
        startTime = roundToNearest15Minutes(startTime);

        // Apply defaults and clean up task data
        const processedTask = {
          title:
            typeof task.title === "string" && task.title.trim()
              ? task.title.trim()
              : "Untitled Task",
          description:
            typeof task.description === "string" ? task.description : "", // Initialize with empty string
          startTime: startTime,
          duration:
            typeof task.duration === "number" &&
            task.duration >= 15 &&
            task.duration <= 480
              ? task.duration
              : 30, // Default 30 minutes
          priority: ["high", "medium", "low"].includes(task.priority)
            ? task.priority
            : "medium",
          date: taskDate, // Use properly parsed date
        };

        console.log(
          `Task ${index} after processing:`,
          JSON.stringify({
            ...processedTask,
            date: processedTask.date.toISOString(), // For logging only
          })
        );
        return processedTask;
      });

      // Validate tasks with zod - always ensure at least one task is returned
      console.log("Validating tasks with Zod schema");
      let validatedTasks = processedTasks.map(
        (task: unknown, index: number) => {
          try {
            const validatedTask = taskExtractSchema.parse(task);
            console.log(
              `Task ${index} validation successful:`,
              JSON.stringify(validatedTask)
            );
            return validatedTask;
          } catch (error) {
            console.error(`Task ${index} validation error:`, error);
            // Instead of returning null, fix the task with defaults
            console.log(`Attempting to fix task ${index}`);
            try {
              // Try to salvage whatever we can from the task
              const fixedTask = {
                title:
                  typeof (task as any)?.title === "string"
                    ? (task as any).title
                    : "Untitled Task",
                description:
                  typeof (task as any)?.description === "string"
                    ? (task as any).description
                    : "",
                startTime:
                  typeof (task as any)?.startTime === "string" &&
                  /^\d{2}:\d{2}$/.test((task as any).startTime)
                    ? (task as any).startTime
                    : "12:00",
                duration:
                  typeof (task as any)?.duration === "number"
                    ? (task as any).duration
                    : 30,
                priority: ["high", "medium", "low"].includes(
                  (task as any)?.priority
                )
                  ? (task as any).priority
                  : "medium",
                date: (task as any)?.date || new Date(),
              };
              console.log(`Fixed task ${index}:`, JSON.stringify(fixedTask));
              return fixedTask as TaskExtract;
            } catch (fixError) {
              console.error(`Failed to fix task ${index}:`, fixError);
              // As a last resort, create a completely default task
              return {
                title: "Task " + (index + 1),
                description: "",
                startTime: "12:00",
                duration: 30,
                priority: "medium",
                date: new Date(),
              } as TaskExtract;
            }
          }
        }
      ) as TaskExtract[];

      // If all tasks failed validation and we have zero tasks, create a default task
      if (validatedTasks.length === 0) {
        console.log("No valid tasks extracted, creating a default task");
        validatedTasks = [
          {
            title: "Task from text",
            description: "",
            startTime: "12:00",
            duration: 30,
            priority: "medium",
            date: new Date(),
          },
        ];
      }

      console.log(
        `Validation complete. Valid tasks: ${validatedTasks.length} out of ${processedTasks.length}`
      );
      console.log("Final validated tasks:", JSON.stringify(validatedTasks));

      return NextResponse.json(validatedTasks);
    } catch (error) {
      console.error("Error parsing JSON from OpenAI:", error);
      return NextResponse.json(
        { error: "Failed to parse extracted tasks" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error extracting tasks:", error);

    // Instead of failing, return a default task
    console.log("Creating default task due to error");
    const defaultTask = {
      title: "Task from text input",
      description: "",
      startTime: "12:00",
      duration: 30,
      priority: "medium",
      date: new Date(),
    };

    // Log the error but return a successful response with a default task
    return NextResponse.json([defaultTask]);
  }
}
