"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAuth, setProcessingAuth] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Set mounted state when component mounts (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get session data from NextAuth with additional options for persistence
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      // Don't redirect - let the middleware handle it
      console.log("Unauthenticated user");
    },
  });

  // Update user state when session changes
  useEffect(() => {
    // If we're still loading the session, keep loading state true
    if (status === "loading") {
      return;
    }

    // If we have a valid session and user
    if (status === "authenticated" && session?.user) {
      setUser({
        id: (session.user.id as string) || (session.user.email as string),
        email: session.user.email as string,
        name: session.user.name,
        image: session.user.image,
      });

      // Store session info in localStorage for persistence checks
      if (typeof window !== "undefined") {
        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", session.user.email as string);
      }
    } else {
      // No valid session
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("userLoggedIn");
        localStorage.removeItem("userEmail");
      }
    }

    // Only set loading to false after we've processed the session
    setLoading(false);
    setProcessingAuth(false);
  }, [session, status]);

  // Logout function with hydration-safe implementation
  const logout = useCallback(async () => {
    try {
      if (processingAuth) return;
      setProcessingAuth(true);

      // Important: First update our local state
      setUser(null);

      // Clear local storage items
      if (typeof window !== "undefined") {
        localStorage.removeItem("userLoggedIn");
        localStorage.removeItem("userEmail");
      }

      // Use a small delay to ensure React has time to reconcile state changes
      setTimeout(async () => {
        await signOut({
          callbackUrl: "/auth",
          redirect: true,
        });
      }, 10);
    } catch (error) {
      console.error("Logout error:", error);
      setProcessingAuth(false);
    }
  }, [processingAuth]);

  // Create context value with all authentication state
  const contextValue: AuthContextType = {
    user,
    loading,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Export the hook for components to access auth state
export function useAuth() {
  return useContext(AuthContext);
}
