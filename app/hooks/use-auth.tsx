import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, type AuthState, type User } from "../utils/google-utils";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadUserFromAPI() {
      try {
        console.log("AuthProvider - Fetching user data");
        const authState: AuthState = await getCurrentUser();

        // Log the response status for debugging
        console.log("AuthProvider - User API response status:", authState);

        if (authState.isAuthenticated && authState.user) {
          console.log("AuthProvider - User data loaded:", !!authState.user);
          setUser(authState.user);
        } else {
          console.log("AuthProvider - Failed to load user, status:", authState);
          setUser(null);
        }
      } catch (err) {
        console.error("AuthProvider - Error loading user:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setUser(null);
      } finally {
        console.log("AuthProvider - Setting loading to false");
        setLoading(false);
      }
    }

    loadUserFromAPI();

    // Add a timeout to stop loading state even if fetch fails
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("AuthProvider - Force finishing loading after timeout");
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  console.log("useAuth - Auth context:", auth);
  return auth;
}