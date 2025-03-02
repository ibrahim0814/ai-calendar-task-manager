import { getServerSession } from "next-auth"
import type { Session, DefaultSession } from "next-auth"
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Extend the default session user type
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
  }
  
  // Extend the user property separately to avoid modifier conflicts
  interface User {
    // Add additional user properties
    id?: string;
  }
}

// Extend JWT to include our custom properties
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
  }
}

// Export auth options that match the ones in [...nextauth]/route.ts
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "development-secret-do-not-use-in-production",
  debug: true,
  callbacks: {
    async jwt({ token, account }) {
      console.log("JWT Callback - account:", !!account);
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      console.log("Session Callback - session:", !!session);
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      
      // If session.user exists, make sure it has all required properties
      if (session.user) {
        // Use email as ID if email exists
        if (session.user.email) {
          // Use type assertion to add id property to user object
          (session.user as any).id = session.user.email
        }
      }
      
      return session
    },
  },
}

export async function auth(): Promise<Session | null> {
  console.log("Auth function called");
  try {
    const session = await getServerSession(authOptions) as Session | null;
    console.log("Session exists:", !!session);
    return session;
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}
