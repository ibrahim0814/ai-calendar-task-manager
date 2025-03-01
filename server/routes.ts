import type { Express } from "express";
import { createServer, type Server } from "http";
import { OAuth2Client } from "google-auth-library";
import { storage } from "./storage";
import { extractTasks } from "./openai";
import { calendar_v3, google } from "googleapis";

const redirectUri = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}/api/auth/callback`;

const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/auth/google", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/userinfo.email"
      ]
    });
    res.redirect(url);
  });

  app.get("/api/auth/callback", async (req, res) => {
    try {
      const { tokens } = await oauth2Client.getToken(req.query.code as string);
      oauth2Client.setCredentials(tokens);

      const userInfo = await google.oauth2("v2").userinfo.get({ auth: oauth2Client });
      const email = userInfo.data.email!;
      const googleId = userInfo.data.id!;

      let user = await storage.getUserByGoogleId(googleId);
      if (!user) {
        user = await storage.createUser({
          email,
          googleId,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!
        });
      }

      req.session.userId = user.id;
      res.redirect("/");
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.post("/api/tasks/process", async (req, res) => {
    try {
      const tasks = await extractTasks(req.body.text);
      const userId = req.session.userId!;
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const createdTasks = [];
      for (const task of tasks) {
        const now = new Date();
        const startTime = new Date(now.setHours(9, 0, 0, 0));

        const event = {
          summary: task.title,
          description: task.description,
          start: { dateTime: startTime.toISOString() },
          end: { 
            dateTime: new Date(startTime.getTime() + task.duration * 60000).toISOString() 
          }
        };

        const calendarEvent = await calendar.events.insert({
          calendarId: "primary",
          requestBody: event
        });

        const createdTask = await storage.createTask({
          userId,
          title: task.title,
          description: task.description,
          scheduledStart: startTime,
          scheduledEnd: new Date(startTime.getTime() + task.duration * 60000),
          isScheduled: true,
          googleEventId: calendarEvent.data.id
        });

        createdTasks.push(createdTask);
      }

      res.json(createdTasks);
    } catch (error) {
      console.error("Task processing error:", error);
      res.status(500).json({ error: "Failed to process tasks" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    const userId = req.session.userId!;
    const tasks = await storage.getTasksByUserId(userId);
    res.json(tasks);
  });

  const httpServer = createServer(app);
  return httpServer;
}