import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Log environment variables to help with debugging
console.log("GOOGLE_CLIENT_ID exists:", !!process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET exists:", !!process.env.GOOGLE_CLIENT_SECRET);
console.log("NEXTAUTH_SECRET exists:", !!process.env.NEXTAUTH_SECRET);
console.log("NEXTAUTH_URL exists:", !!process.env.NEXTAUTH_URL);

if (!process.env.NEXTAUTH_SECRET) {
  console.warn(
    "WARNING: NEXTAUTH_SECRET is not set. Using an insecure default for development only."
  );
}

// The main setup without specifying the prompt in authorization (will be dynamic)
const googleProvider = GoogleProvider({
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
});

const handler = NextAuth({
  providers: [googleProvider],
  // Add a default secret if none is provided
  secret:
    process.env.NEXTAUTH_SECRET ||
    "development-secret-do-not-use-in-production",
  debug: true, // Enable debug mode
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
    async jwt({ token, account, user }) {
      console.log(
        "JWT Callback account details:",
        account ? "Present" : "Not present"
      );
      console.log(
        "JWT Callback user details:",
        user ? "Present" : "Not present"
      );

      // Initial sign in
      if (account && user) {
        console.log("JWT Callback - Processing initial sign in");
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
      if (Date.now() < ((token.accessTokenExpires as number) || 0)) {
        console.log("JWT Callback - Using existing token");
        return token;
      }

      // Access token has expired, try to update it
      console.log("JWT Callback - Token expired, attempting refresh");
      if (!token.refreshToken) {
        console.error("No refresh token available");
        return {
          ...token,
          error: "NoRefreshTokenError",
        };
      }

      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
          console.error("Failed to refresh token:", refreshedTokens);
          return {
            ...token,
            error: "RefreshAccessTokenError",
          };
        }

        console.log("Token refreshed successfully");
        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          accessTokenExpires:
            Date.now() + (refreshedTokens.expires_in || 3600) * 1000,
          // Keep the refresh token if a new one wasn't returned
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
      } catch (error) {
        console.error("Error refreshing token:", error);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
    async session({ session, token }) {
      console.log("Session Callback - token exists:", !!token);

      if (token) {
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
        session.error = token.error as string;

        // Ensure user object has all properties
        if (session.user) {
          session.user.id = token.sub as string;
        }
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };
