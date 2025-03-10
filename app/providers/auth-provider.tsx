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
  const router = useRouter();

  // Get session data from NextAuth
  const { data: session, status } = useSession();

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
    } else {
      // No valid session
      setUser(null);
    }

    // Only set loading to false after we've processed the session
    setLoading(false);
    setProcessingAuth(false);
  }, [session, status]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (processingAuth) return;
      setProcessingAuth(true);

      await signOut({ redirect: false });
    } catch (error) {
      console.error("Logout error:", error);
      setProcessingAuth(false);
    }
  }, [processingAuth]);

  const contextValue: AuthContextType = {
    user,
    loading,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
