import { Task, InsertTask, User, InsertUser } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  getTasksByUserId(userId: number): Promise<Task[]>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private currentUserId: number;
  private currentTaskId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.currentUserId = 1;
    this.currentTaskId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId
    );
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task = { ...insertTask, id };
    this.tasks.set(id, task);
    return task;
  }

  async getTasksByUserId(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.userId === userId
    );
  }
}

export const storage = new MemStorage();
