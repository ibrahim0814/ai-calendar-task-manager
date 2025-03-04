import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import { auth } from "../../../lib/auth";
import { google } from "googleapis";
import { z } from "zod";
import { TaskExtract } from "../../../lib/types";

// Initialize OpenAI with API key if available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Task extraction schema
const taskExtractSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().min(15).max(480),
  priority: z.enum(["high", "medium", "low"]),
});

// Task schema for validation
const TaskSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  date: z.string().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  completed: z.boolean().optional().default(false),
  priority: z.enum(["high", "medium", "low"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    // Get the session
    const session = await auth();

    // Check if user is authenticated
    if (!session?.accessToken) {
      console.error("No access token available - redirect to auth page");
      return new NextResponse(JSON.stringify({ 
        message: "Unauthorized", 
        redirect: true,
        redirectUrl: "/auth"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    
    // Check if session has an error
    if (session.error) {
      console.error("Session has error:", session.error);
      return new NextResponse(JSON.stringify({ 
        message: "Session error", 
        error: session.error,
        redirect: true,
        redirectUrl: "/auth"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Parse query parameters to get month and year if provided
    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month");
    const yearParam = url.searchParams.get("year");

    // Default to current month if not specified
    const now = new Date();
    const month = monthParam ? parseInt(monthParam) : now.getMonth();
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();

    // Get first and last day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    try {
      console.log(
        `Fetching events from ${firstDayOfMonth.toISOString()} to ${lastDayOfMonth.toISOString()}`
      );

      // First get all calendars the user has access to
      const calendarList = await calendar.calendarList.list();
      const calendarIds = calendarList.data.items
        ?.map((cal) => cal.id)
        .filter((id) => id !== null && id !== undefined) || ["primary"];

      // Fetch events from all calendars
      let allEvents: any[] = [];

      for (const calendarId of calendarIds) {
        try {
          if (calendarId) {
            const response = await calendar.events.list({
              calendarId: calendarId,
              timeMin: firstDayOfMonth.toISOString(),
              timeMax: lastDayOfMonth.toISOString(),
              singleEvents: true,
              orderBy: "startTime",
              maxResults: 100,
            });

            const events = response.data.items || [];
            allEvents = [...allEvents, ...events];
          }
        } catch (err) {
          console.error(
            `Error fetching events from calendar ${calendarId}:`,
            err
          );
          // Continue with next calendar
        }
      }

      // Map events to our task format
      const formattedEvents = allEvents.map((event) => {
        // Try to extract priority from description
        let priority = "medium"; // Default priority

        if (event.description) {
          // Check for priority tag in the description
          const priorityMatch = event.description.match(
            /\[Priority: (high|medium|low)\]/i
          );
          if (priorityMatch && priorityMatch[1]) {
            priority = priorityMatch[1].toLowerCase();
          }
        }

        return {
          id: event.id,
          title: event.summary || "Untitled Event",
          description: event.description
            ? event.description
                .replace(/\[Priority: (high|medium|low)\]/i, "") // Remove the priority tag from displayed description
                .replace(/\[Created by AI Calendar Assistant\]/i, "")
                .trim()
            : "",
          startTime: event.start?.dateTime || event.start?.date,
          endTime: event.end?.dateTime || event.end?.date,
          priority: priority,
          isAllDay: !event.start?.dateTime && !!event.start?.date,
          calendarId: event.organizer?.email || "", // Include source calendar
        };
      });

      console.log(
        `Found ${formattedEvents.length} events across ${calendarIds.length} calendars`
      );
      return NextResponse.json(formattedEvents);
    } catch (error: any) {
      console.error("Error fetching calendar events:", error);

      // Return empty array instead of mock tasks
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  console.log("--------- TASK CREATION API CALLED ---------");

  try {
    // Authenticate the request
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

    // Get the request body
    const body = await req.json();
    console.log("Received task data:", JSON.stringify(body));

    // Validate the task data
    try {
      console.log("Validating task data");

      // Check for required fields
      const { title, startTime, endTime, priority } = body;

      if (!title || typeof title !== "string") {
        console.error("Validation error: title is required");
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 }
        );
      }

      if (!startTime || !endTime) {
        console.error("Validation error: startTime and endTime are required");
        return NextResponse.json(
          { error: "Start time and end time are required" },
          { status: 400 }
        );
      }

      // Description is optional but should be a string if present
      const { description } = body;
      if (description && typeof description !== "string") {
        console.error("Validation error: description must be a string");
        return NextResponse.json(
          { error: "Description must be a string" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Task validation error:", error);
      return NextResponse.json({ error: "Invalid task data" }, { status: 400 });
    }

    // Check if this is a direct task creation (from confirmation) or natural language input
    // If the body has a direct task structure with title, startTime, endTime, and priority,
    // we'll skip the OpenAI processing and create the task directly
    if (body.title && body.startTime && body.endTime && body.priority) {
      console.log("Direct task creation - skipping OpenAI processing");

      // Schedule the task in Google Calendar
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: session.accessToken,
      });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      try {
        console.log("Creating event in Google Calendar");

        const startTime = new Date(body.startTime);
        const endTime = new Date(body.endTime);

        console.log(
          `Start time: ${startTime.toISOString()}, End time: ${endTime.toISOString()}`
        );

        const event = await calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: body.title,
            description: body.description
              ? `${body.description}\n\n[Priority: ${body.priority}]\n[Created by AI Calendar Assistant]`
              : `[Priority: ${body.priority}]\n[Created by AI Calendar Assistant]`,
            start: {
              dateTime: startTime.toISOString(),
              timeZone: "America/Los_Angeles",
            },
            end: {
              dateTime: endTime.toISOString(),
              timeZone: "America/Los_Angeles",
            },
          },
        });

        console.log("Event created successfully:", event.data.id);

        return NextResponse.json({
          ...body,
          googleEventId: event.data.id,
          scheduledStart: startTime,
          scheduledEnd: endTime,
        });
      } catch (error) {
        console.error("Error creating calendar event:", error);
        return NextResponse.json(
          { error: "Failed to create calendar event" },
          { status: 500 }
        );
      }
    }

    // Only proceed with OpenAI processing if we're handling natural language input
    // (which would have the description field containing the input)
    if (!openai) {
      throw new Error("OpenAI API key is not set");
    }

    // Extract tasks using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Extract tasks from the user's text input. For each task, provide a title, optional description, start time (in HH:mm format), estimated duration in minutes (15-480), and priority level. Follow time-blocking best practices and ensure tasks don't overlap. Tasks must have a duration of at least 15 minutes.",
        },
        {
          role: "user",
          content: body.description,
        },
      ],
      functions: [
        {
          name: "extractTasks",
          description: "Extract tasks from user input",
          parameters: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
                    duration: { type: "number", minimum: 15, maximum: 480 },
                    priority: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                    },
                  },
                  required: ["title", "startTime", "duration", "priority"],
                },
              },
            },
            required: ["tasks"],
          },
        },
      ],
      function_call: { name: "extractTasks" },
    });

    console.log("OpenAI response:", JSON.stringify(completion));

    const functionCall = completion.choices[0].message.function_call;
    if (!functionCall?.arguments) {
      throw new Error("No tasks extracted");
    }

    const { tasks } = JSON.parse(functionCall.arguments);
    // Validate tasks with zod schema
    const validTasks = tasks
      .filter((task: any) => task.duration > 0)
      .map((task: any) => taskExtractSchema.parse(task));

    console.log("Valid tasks:", JSON.stringify(validTasks));

    // Schedule tasks in Google Calendar
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const scheduledTasks = await Promise.all(
      validTasks.map(async (task: TaskExtract) => {
        const [hours, minutes] = task.startTime.split(":").map(Number);
        const startTime = new Date();
        startTime.setHours(hours, minutes, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + task.duration);

        const event = await calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: task.title,
            description: task.description
              ? `${task.description}\n\n[Priority: ${task.priority}]\n[Created by AI Calendar Assistant]`
              : `[Priority: ${task.priority}]\n[Created by AI Calendar Assistant]`,
            start: {
              dateTime: startTime.toISOString(),
              timeZone: "America/Los_Angeles",
            },
            end: {
              dateTime: endTime.toISOString(),
              timeZone: "America/Los_Angeles",
            },
          },
        });

        return {
          ...task,
          googleEventId: event.data.id,
          scheduledStart: startTime,
          scheduledEnd: endTime,
        };
      })
    );

    console.log("Scheduled tasks:", JSON.stringify(scheduledTasks));

    return NextResponse.json(scheduledTasks);
  } catch (error) {
    console.error("Error processing tasks:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a task in Google Calendar
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      });
    }

    const data = await req.json();
    const { id, title, description, startTime, endTime, priority } = data;

    if (!id || !title || !startTime || !endTime) {
      return new NextResponse(
        JSON.stringify({ message: "Missing required fields" }),
        { status: 400 }
      );
    }

    // Format the event for Google Calendar
    const event = {
      summary: title,
      description: `${description || ""}\n\nPriority: ${priority || "medium"}`,
      start: {
        dateTime: startTime,
        timeZone: "UTC",
      },
      end: {
        dateTime: endTime,
        timeZone: "UTC",
      },
    };

    // Update the event in Google Calendar
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    try {
      const response = await calendar.events.patch({
        calendarId: "primary",
        eventId: id,
        requestBody: event,
      });

      return new NextResponse(JSON.stringify(response.data), { status: 200 });
    } catch (error: any) {
      console.error("Error updating event:", error);
      return new NextResponse(
        JSON.stringify({
          message: "An error occurred while updating the event",
          error: error.message,
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating event:", error);
    return new NextResponse(
      JSON.stringify({ message: "An error occurred while updating the event" }),
      { status: 500 }
    );
  }
}

// Add DELETE endpoint
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if access token exists
    if (!session.accessToken) {
      return NextResponse.json(
        { error: "No access token available" },
        { status: 401 }
      );
    }

    // Get the event ID from the request
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    try {
      // Delete the event from Google Calendar
      await calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting calendar event:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete event" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in DELETE handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
