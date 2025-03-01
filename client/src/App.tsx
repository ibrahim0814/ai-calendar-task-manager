import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, useNavigate } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth"; // Assuming useAuth is available
import { useEffect, useState } from 'react';
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";


function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
        if (data.authenticated && window.location.pathname === '/') {
          navigate('/home');
        } else if (!data.authenticated && window.location.pathname === '/home') {
          navigate('/');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? () => navigate('/home') : AuthPage} />
      <Route path="/home" component={isAuthenticated ? HomePage : () => navigate('/')} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;