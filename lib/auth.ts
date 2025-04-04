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
          prompt: "consent",
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  pages: {
    signIn: "/auth", // Custom sign-in page
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // If no callbackUrl is provided, use the default baseUrl
      if (!url.startsWith("/")) {
        return baseUrl;
      }
      // Otherwise, return the provided callback URL
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        console.log(
          "JWT Callback - Processing initial sign in from lib/auth.ts"
        );
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 3600 * 1000,
        };
      }

      // Return previous token if the access token has not expired yet
      const now = Date.now();
      if (token.accessTokenExpires && now < token.accessTokenExpires) {
        console.log("JWT Callback - Using existing token from lib/auth.ts");
        return token;
      }

      // Access token has expired, try to update it using refresh token
      console.log(
        "JWT Callback - Token expired, attempting refresh from lib/auth.ts"
      );
      if (!token.refreshToken) {
        console.error("No refresh token available in lib/auth.ts");
        return { ...token, error: "NoRefreshTokenError" };
      }

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

        if (!response.ok) {
          console.error("Failed to refresh token in lib/auth.ts:", tokens);
          throw tokens;
        }

        console.log("Token refreshed successfully in lib/auth.ts");
        return {
          ...token,
          accessToken: tokens.access_token,
          accessTokenExpires: Date.now() + (tokens.expires_in || 3600) * 1000,
          // Keep the refresh token if a new one wasn't returned
          refreshToken: tokens.refresh_token ?? token.refreshToken,
        };
      } catch (error) {
        console.error("Error refreshing access token in lib/auth.ts", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      console.log("Session Callback - token exists:", !!token);

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

    // Log if there are any errors in the session
    if (session?.error) {
      console.error("Session has error:", session.error);
    }

    return session;
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}
