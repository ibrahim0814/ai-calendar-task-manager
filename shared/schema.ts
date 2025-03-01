import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  googleId: text("google_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  scheduledStart: timestamp("scheduled_start"),
  scheduledEnd: timestamp("scheduled_end"),
  isScheduled: boolean("is_scheduled").default(false),
  googleEventId: text("google_event_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertTaskSchema = createInsertSchema(tasks);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const taskExtractSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  duration: z.number().min(15).max(480), // duration in minutes
  priority: z.enum(["high", "medium", "low"]),
});

export type TaskExtract = z.infer<typeof taskExtractSchema>;
