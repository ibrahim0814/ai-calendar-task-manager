import { NextResponse } from "next/server"
import { OpenAI } from "openai"
import { auth } from "@/lib/auth"
import { google } from "googleapis"

const openai = new OpenAI()

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { text } = body

    // Extract tasks using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Extract tasks from the user's text input. For each task, provide a title, optional description, start time (in HH:mm format), estimated duration in minutes (15-480), and priority level. Follow time-blocking best practices and ensure tasks don't overlap. Tasks must have a duration of at least 15 minutes."
        },
        {
          role: "user",
          content: text
        }
      ],
      function_call: {
        name: "extractTasks",
        arguments: JSON.stringify({
          tasks: []
        })
      },
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
                    startTime: { type: "string" },
                    duration: { type: "number" },
                    priority: { type: "string", enum: ["high", "medium", "low"] }
                  },
                  required: ["title", "startTime", "duration", "priority"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      ]
    })

    const functionCall = completion.choices[0].message.function_call
    if (!functionCall?.arguments) {
      throw new Error("No tasks extracted")
    }

    const { tasks } = JSON.parse(functionCall.arguments)
    const validTasks = tasks.filter((task: any) => task.duration > 0)

    // Schedule tasks in Google Calendar
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    const scheduledTasks = await Promise.all(
      validTasks.map(async (task: any) => {
        const [hours, minutes] = task.startTime.split(":").map(Number)
        const startTime = new Date()
        startTime.setHours(hours, minutes, 0)

        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + task.duration)

        const event = await calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: task.title,
            description: task.description 
              ? `${task.description}\n\n[Created by AI Calendar Assistant]` 
              : '[Created by AI Calendar Assistant]',
            start: {
              dateTime: startTime.toISOString(),
              timeZone: "America/Los_Angeles"
            },
            end: {
              dateTime: endTime.toISOString(),
              timeZone: "America/Los_Angeles"
            }
          }
        })

        return {
          ...task,
          googleEventId: event.data.id,
          scheduledStart: startTime,
          scheduledEnd: endTime
        }
      })
    )

    return NextResponse.json(scheduledTasks)
  } catch (error) {
    console.error("Error processing tasks:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Get events for today
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: tomorrow.toISOString(),
      singleEvents: true,
      orderBy: "startTime"
    })

    const events = response.data.items?.map(event => ({
      id: event.id,
      title: event.summary,
      description: event.description,
      scheduledStart: event.start?.dateTime,
      scheduledEnd: event.end?.dateTime,
      isAICreated: event.description?.includes('[Created by AI Calendar Assistant]')
    })) || []

    return NextResponse.json(events)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
