import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { OAuth2Client } from "google-auth-library";
import { storage } from "./storage";
import { extractTasks } from "./openai";
import { calendar_v3, google } from "googleapis";
import session from "express-session";

const redirectUri = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}/api/auth/callback`;

console.log("Configured redirect URI:", redirectUri);

const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware if not already configured
  if (!app._router || !app._router.stack.some((layer: any) => layer.name === 'session')) {
    app.use(session({
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }));
  }
  app.get("/api/auth/google", (req, res) => {
    try {
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/userinfo.email"
        ]
      });
      console.log("Generated auth URL:", url);
      res.redirect(url);
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).send("Failed to initialize authentication");
    }
  });

  app.get("/api/auth/callback", async (req, res) => {
    try {
      console.log("Received callback with code:", req.query.code ? "present" : "missing");

      if (req.query.error === 'access_denied') {
        throw new Error("Access denied. Please ensure you are added as a test user in the Google Cloud Console.");
      }

      if (!req.query.code) {
        throw new Error("No authorization code received");
      }

      const { tokens } = await oauth2Client.getToken(req.query.code as string);
      oauth2Client.setCredentials(tokens);

      const userInfo = await google.oauth2("v2").userinfo.get({ auth: oauth2Client });
      const email = userInfo.data.email!;
      const googleId = userInfo.data.id!;

      console.log("Successfully authenticated user:", email);

      let user = await storage.getUserByGoogleId(googleId);
      if (!user) {
        user = await storage.createUser({
          email,
          googleId,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || ''  // Handle missing refresh token
        });
        console.log("Created new user account for:", email);
      }

      // Make sure session is initialized before setting properties
      if (!req.session) {
        req.session = {} as any;
      }
      
      req.session.userId = user.id;
      await new Promise<void>((resolve) => {
        req.session.save(() => {
          console.log("Session saved with userId:", user.id);
          resolve();
        });
      });
      
      res.redirect("/");
    } catch (error: any) {
      console.error("Auth callback error:", {
        message: error.message,
        stack: error.stack,
        details: error.response?.data,
        query: req.query
      });
      res.redirect("/auth?error=" + encodeURIComponent(error.message));
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

  app.get("/api/user", async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.json({ authenticated: false });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.json({ authenticated: false });
      }
      
      return res.json({ 
        authenticated: true, 
        user: { 
          id: user.id, 
          email: user.email 
        } 
      });
    } catch (error) {
      console.error("Error getting user info:", error);
      return res.status(500).json({ error: "Failed to get user info" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = req.session.userId;
    const tasks = await storage.getTasksByUserId(userId);
    res.json(tasks);
  });

  const httpServer = createServer(app);
  return httpServer;
}