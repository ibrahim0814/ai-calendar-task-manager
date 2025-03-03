import { z } from "zod";

export const taskExtractSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().min(15).max(480),
  priority: z.enum(["high", "medium", "low"]),
});

export type TaskExtract = z.infer<typeof taskExtractSchema>;

export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  priority?: "low" | "medium" | "high";
  category?: string;
  isAICreated?: boolean;
  googleEventId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  date?: string;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}
