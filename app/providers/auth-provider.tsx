"use client";

import { createContext, useContext, useState, useEffect } from "react";
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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Get session data from NextAuth
  const { data: session, status } = useSession();

  // Update user state when session changes
  useEffect(() => {
    if (status === "loading") {
      // Still loading
      setLoading(true);
    } else if (status === "authenticated" && session?.user) {
      // User is authenticated
      setUser({
        id: (session.user.id as string) || (session.user.email as string),
        email: session.user.email as string,
        name: session.user.name,
        image: session.user.image,
      });
      setLoading(false);
    } else if (status === "unauthenticated") {
      // No session from NextAuth, user is not authenticated
      setUser(null);
      setLoading(false);
    }
  }, [session, status]);

  // Google sign in function
  const signInWithGoogle = async () => {
    try {
      // Set a cookie to remember this user has visited before
      document.cookie = "returning_user=true; path=/; max-age=31536000"; // 1 year

      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.ok) {
        // On successful sign in, the useSession hook will
        // update with the new session data
        router.replace("/");
      } else if (result?.error) {
        console.error("Sign in error:", result.error);
      }
    } catch (error) {
      console.error("Sign in exception:", error);
    }
  };

  // Create context value
  const contextValue: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
