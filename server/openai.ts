import OpenAI from "openai";
import { taskExtractSchema, type TaskExtract } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractTasks(text: string): Promise<TaskExtract[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Extract tasks from the user's text input. Each task should have a title, optional description, estimated duration in minutes, and priority level. Follow time-blocking best practices."
        },
        {
          role: "user",
          content: text
        }
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
                    duration: { type: "number", minimum: 15, maximum: 480 },
                    priority: { type: "string", enum: ["high", "medium", "low"] }
                  },
                  required: ["title", "duration", "priority"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      ],
      function_call: { name: "extractTasks" }
    });

    const functionCall = response.choices[0].message.function_call;
    if (!functionCall?.arguments) {
      throw new Error("No tasks extracted");
    }

    const { tasks } = JSON.parse(functionCall.arguments);
    return tasks.map((task: TaskExtract) => taskExtractSchema.parse(task));
  } catch (error) {
    console.error("Error extracting tasks:", error);
    throw new Error("Failed to extract tasks from input");
  }
}
