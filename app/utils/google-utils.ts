import { User, AuthState } from "../../lib/types";

export type { User };
export type { AuthState };

/**
 * Fetches the current user session information from the Next.js API
 * Handles token refresh errors and returns authentication state
 */
export async function getCurrentUser(): Promise<AuthState> {
  try {
    // Use cache: 'no-store' to always get fresh session data
    const response = await fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      console.error("Session API error:", response.status, response.statusText);
      return {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: `API error: ${response.status}`,
      };
    }

    const session = await response.json();

    // Check for session errors
    if (session.error) {
      console.error("Session error:", session.error);

      // Handle specific error types
      if (session.error === "RefreshAccessTokenError") {
        // Clear session and redirect to auth
        await fetch("/api/auth/signout", { method: "POST" });
        window.location.href = "/auth?error=token_expired";
        return {
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          error: "token_expired",
        };
      }
    }

    // No session means not logged in
    if (!session || !session.user) {
      console.log("No valid session found");
      return {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: "no_session",
      };
    }

    // Valid session with user
    return {
      isAuthenticated: true,
      user: session.user,
      accessToken: session.accessToken || null,
      refreshToken: session.refreshToken || null,
      error: undefined,
    };
  } catch (error) {
    console.error("Error fetching session:", error);
    return {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
