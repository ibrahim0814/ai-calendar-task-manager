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
    const [hours, minutes] = timeString.split(':').map(Number);
    const roundedMinutes = Math.round(minutes / 15) * 15;
    
    // Handle case where minutes round to 60
    let adjustedHours = hours;
    let adjustedMinutes = roundedMinutes;
    
    if (roundedMinutes === 60) {
      adjustedMinutes = 0;
      adjustedHours = (hours + 1) % 24;
    }
    
    return `${adjustedHours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
  } catch (e) {
    console.error("Error rounding time:", e);
    return timeString; // Return original if parsing fails
  }
}

// Task extraction schema
const taskExtractSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().min(15).max(480),
  priority: z.enum(["high", "medium", "low"])
});

export async function POST(req: NextRequest) {
  console.log("--------- TASK EXTRACTION API CALLED ---------");
  try {
    const session = await auth();
    console.log("Auth session:", JSON.stringify({
      userId: session?.user?.id,
      authenticated: !!session?.user
    }));
    
    if (!session?.user) {
      console.log("Authentication failed - no session or user");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
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
    // Extract tasks using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that extracts tasks from user input.
          Extract the following information for each task mentioned:
          - title: (REQUIRED) The title of the task
          - startTime: (REQUIRED) The start time in HH:MM format (24h). Please use only 15-minute increments (00, 15, 30, 45)
          - duration: (REQUIRED) The duration in minutes (must be a number between 15 and 480)
          - priority: (REQUIRED) The priority level (must be exactly "high", "medium", or "low")
          
          IMPORTANT: 
          - DO NOT include descriptions in your output. Only extract titles.
          - All fields are REQUIRED. Always include a numeric duration.
          - If duration is not specified, use a reasonable default based on the task type (30-60 minutes).
          - For start times, always round to the nearest 15-minute increment (00, 15, 30, or 45 minutes).
          
          Format your response as a JSON object with a "tasks" array containing the extracted tasks.
          For example:
          {
            "tasks": [
              {
                "title": "Team meeting",
                "startTime": "09:00",
                "duration": 60,
                "priority": "high"
              }
            ]
          }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    console.log("OpenAI API response:", content);
    
    if (!content) {
      console.log("Empty response from OpenAI");
      return NextResponse.json(
        { error: "Failed to extract tasks" },
        { status: 500 }
      );
    }

    try {
      console.log("Parsing JSON response");
      const parsed = JSON.parse(content);
      console.log("Parsed response:", JSON.stringify(parsed));
      
      const tasks = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.tasks) ? parsed.tasks : [parsed]);
      console.log("Extracted tasks array:", JSON.stringify(tasks));
      
      // Process tasks to ensure all required fields have values
      console.log("Processing and applying defaults to tasks");
      const processedTasks = tasks.map((task: any, index: number) => {
        console.log(`Processing task ${index}:`, JSON.stringify(task));
        // Apply defaults and clean up task data
        const processedTask = {
          title: task.title || "Untitled Task",
          description: "", // Initialize with empty string - no automatic description
          startTime: roundToNearest15Minutes(task.startTime || "12:00"), // Round to nearest 15 min
          duration: typeof task.duration === 'number' ? task.duration : 30, // Default 30 minutes
          priority: ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium"
        };
        console.log(`Task ${index} after processing:`, JSON.stringify(processedTask));
        return processedTask;
      });
      
      // Validate tasks with zod
      console.log("Validating tasks with Zod schema");
      const validatedTasks = processedTasks.map((task: unknown, index: number) => {
        try {
          const validatedTask = taskExtractSchema.parse(task);
          console.log(`Task ${index} validation successful:`, JSON.stringify(validatedTask));
          return validatedTask;
        } catch (error) {
          console.error(`Task ${index} validation error:`, error);
          return null;
        }
      }).filter(Boolean) as TaskExtract[];
      
      console.log(`Validation complete. Valid tasks: ${validatedTasks.length} out of ${processedTasks.length}`);
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
