import { getServerSession } from "next-auth";
import type { Session, DefaultSession } from "next-auth";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Extend the default session user type
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
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
    accessTokenExpires?: number;
    error?: string;
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
          scope:
            "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events openid email profile",
          access_type: "offline",
          prompt: "consent", // Always request refresh token
        },
      },
    }),
  ],
  secret:
    process.env.NEXTAUTH_SECRET ||
    "development-secret-do-not-use-in-production",
  debug: true,
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 days (2 weeks)
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 14 * 24 * 60 * 60, // 14 days (2 weeks)
      },
    },
  },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : 0;
      }

      // Return previous token if the access token has not expired yet
      const now = Date.now();
      if (token.accessTokenExpires && now < token.accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to update it using refresh token
      if (token.refreshToken) {
        try {
          const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID || "",
              client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
              grant_type: "refresh_token",
              refresh_token: token.refreshToken,
            }),
          });

          const tokens = await response.json();

          if (!response.ok) throw tokens;

          return {
            ...token,
            accessToken: tokens.access_token,
            accessTokenExpires: Date.now() + tokens.expires_in * 1000,
          };
        } catch (error) {
          console.error("Error refreshing access token", error);
          return { ...token, error: "RefreshAccessTokenError" };
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.error = token.error;

        if (session.user) {
          session.user.id = token.sub;
        }
      }

      return session;
    },
  },
};

export async function auth(): Promise<Session | null> {
  console.log("Auth function called");
  try {
    const session = (await getServerSession(authOptions)) as Session | null;
    console.log("Session exists:", !!session);
    return session;
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}
