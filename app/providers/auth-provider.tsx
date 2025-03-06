"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession, signOut } from "next-auth/react";

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAuth, setProcessingAuth] = useState(false);
  const router = useRouter();
  const initialLoadTimeoutRef = useRef<NodeJS.Timeout>();
  const hasInitializedRef = useRef(false);

  // Get session data from NextAuth
  const { data: session, status } = useSession();

  // Update user state when session changes
  useEffect(() => {
    // Clear any existing timeout
    if (initialLoadTimeoutRef.current) {
      clearTimeout(initialLoadTimeoutRef.current);
    }

    if (status === "loading") {
      // Still loading
      setLoading(true);

      // Set a maximum loading time of 5 seconds
      initialLoadTimeoutRef.current = setTimeout(() => {
        if (!hasInitializedRef.current) {
          console.warn(
            "Auth state took too long to load, forcing unauthenticated state"
          );
          setLoading(false);
          setUser(null);
          setProcessingAuth(false);
          hasInitializedRef.current = true;
        }
      }, 5000);
    } else {
      hasInitializedRef.current = true;

      if (status === "authenticated" && session?.user) {
        // User is authenticated
        setUser({
          id: (session.user.id as string) || (session.user.email as string),
          email: session.user.email as string,
          name: session.user.name,
          image: session.user.image,
        });
        setLoading(false);
        setProcessingAuth(false);
      } else if (status === "unauthenticated") {
        // No session from NextAuth, user is not authenticated
        setUser(null);
        setLoading(false);
        setProcessingAuth(false);
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
      }
    };
  }, [session, status]);

  // Google sign in function
  const signInWithGoogle = useCallback(async () => {
    try {
      if (processingAuth) return; // Prevent multiple sign-in attempts

      setProcessingAuth(true);
      setLoading(true); // Set loading state while signing in

      // Set a cookie to remember this user has visited before
      document.cookie = "returning_user=true; path=/; max-age=31536000"; // 1 year

      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.ok) {
        // On successful sign in, the useSession hook will
        // update with the new session data
        // Don't call router.replace here - let the session update
        // and let protected routes handle redirect
      } else if (result?.error) {
        console.error("Sign in error:", result.error);
        setProcessingAuth(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("Sign in exception:", error);
      setProcessingAuth(false);
      setLoading(false);
    }
  }, [processingAuth]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (processingAuth) return; // Prevent multiple logout attempts

      setProcessingAuth(true);
      setLoading(true); // Set loading state while logging out

      await signOut({ redirect: false });
      // Don't redirect here, let the session update trigger it
    } catch (error) {
      console.error("Logout error:", error);
      setProcessingAuth(false);
      setLoading(false);
    }
  }, [processingAuth]);

  // Create context value
  const contextValue: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
