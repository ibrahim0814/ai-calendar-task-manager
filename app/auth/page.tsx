"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../providers/auth-provider";
import { signIn } from "next-auth/react";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Ensure we're running on the client
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    // Check for error in URL
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      if (errorParam) {
        setError(decodeURIComponent(errorParam));
      }
    }
  }, []);

  // If user is authenticated, redirect to home page
  useEffect(() => {
    if (isClient && !loading && user) {
      console.log("Auth page - User is already authenticated, redirecting to home");
      router.replace("/");
    }
  }, [user, loading, router, isClient]);

  // Sign in function - just select an account, no consent prompt for returning users
  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signIn("google", {
        callbackUrl: "/",
        prompt: "select_account" // Just select account for sign in
      });
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Failed to sign in with Google");
      setIsSigningIn(false);
    }
  };

  // Register function - always ask for consent to ensure we get refresh tokens 
  const handleRegister = async () => {
    try {
      setIsRegistering(true);
      await signIn("google", {
        callbackUrl: "/",
        prompt: "consent" // Always request consent for new users
      });
    } catch (error) {
      console.error("Register error:", error);
      setError("Failed to register with Google");
      setIsRegistering(false);
    }
  };

  // If still loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="ml-2 text-sm text-gray-500">Loading authentication state...</p>
      </div>
    );
  }

  // Only show login page if we're sure there's no user
  if (!loading && !user) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="flex items-center justify-center p-8 bg-slate-900 text-white">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold">Welcome</h1>
              <p className="text-slate-300">Sign in or register to manage your calendar</p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">Authentication failed: {error}</p>
              </div>
            )}

            <div className="space-y-4">
              <Button
                className="w-full bg-white text-slate-900 hover:bg-slate-100"
                onClick={handleSignIn}
                disabled={isSigningIn || isRegistering}
              >
                {isSigningIn ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-700"></span>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-slate-900 text-slate-500">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-slate-700 text-white hover:text-slate-900"
                onClick={handleRegister}
                disabled={isSigningIn || isRegistering}
              >
                {isRegistering ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full mr-2"></div>
                    Registering...
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                    </svg>
                    Register with Google
                  </>
                )}
              </Button>
            </div>

            <p className="text-sm text-center text-slate-500">
              <span className="block">First time? Use Register to grant all permissions.</span>
              <span className="block mt-1">Returning user? Just Sign In.</span>
            </p>
          </div>
        </div>
        <div className="hidden lg:flex items-center justify-center p-8">
          <div className="relative w-full max-w-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg blur-xl opacity-50 animate-pulse"></div>
            <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-lg shadow-xl">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white">Smart Scheduler</h2>
                <p className="text-slate-300">
                  Leverage AI to organize your day, prioritize tasks, and optimize your calendar.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <h3 className="font-medium text-white mb-2">Smart Scheduling</h3>
                    <p className="text-sm text-slate-400">AI-powered scheduling that learns your preferences.</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <h3 className="font-medium text-white mb-2">Task Prioritization</h3>
                    <p className="text-sm text-slate-400">Automatically arrange tasks based on deadlines and importance.</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <h3 className="font-medium text-white mb-2">Calendar Integration</h3>
                    <p className="text-sm text-slate-400">Seamlessly integrates with your Google Calendar.</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <h3 className="font-medium text-white mb-2">Time Analytics</h3>
                    <p className="text-sm text-slate-400">Insights into how you spend your time for better productivity.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading placeholder while we wait for redirect to happen
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      <p className="ml-2 text-sm text-gray-500">Redirecting to dashboard...</p>
    </div>
  );
}
