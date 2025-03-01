import passport from "passport";
import session from "express-session";
import { Express } from "express";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

declare global {
  namespace Express {
    interface User extends Omit<User, keyof User> {
      id: number;
      email: string;
      googleId: string;
    }
  }
}

export function setupAuth(app: Express) {
  // Don't configure session middleware again - it's already set up in index.ts
  
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user to store in session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Middleware to check if user is authenticated
  app.use(["/api/tasks", "/api/tasks/process"], (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });

  // Middleware to handle OAuth errors
  app.use((err: any, req: any, res: any, next: any) => {
    if (err.name === "OAuth2Error") {
      return res.redirect("/auth?error=oauth");
    }
    next(err);
  });

  // Endpoint to check authentication status
  app.get("/api/auth/status", (req, res) => {
    if (req.session.userId) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.sendStatus(200);
    });
  });
}