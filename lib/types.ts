import { z } from "zod"

export const taskExtractSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().min(15).max(480),
  priority: z.enum(["high", "medium", "low"])
})

export type TaskExtract = z.infer<typeof taskExtractSchema>

export interface Task {
  id: string
  title: string
  description?: string
  scheduledStart: string
  scheduledEnd: string
  isAICreated?: boolean
}
