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
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  useEffect(() => {
    // Check for error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, []);

  // If user is authenticated, redirect to home page
  useEffect(() => {
    if (!loading && user) {
      console.log("Auth page - User is already authenticated, redirecting to home");
      router.replace("/");
    }
  }, [user, loading, router]);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="ml-2 text-sm text-slate-400">Loading authentication state...</p>
      </div>
    );
  }

  // Only show login page if we're sure there's no user
  if (!loading && !user) {
    return (
      <div className="min-h-screen flex bg-slate-950">
        {/* Left section - Sign in/Register */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-md backdrop-blur-lg bg-slate-900/80 p-8 rounded-xl shadow-2xl border border-slate-800">
            <div className="space-y-2 text-center mb-8">
              <h1 className="text-3xl font-bold text-white">Welcome</h1>
              <p className="text-slate-400">Sign in or register to manage your calendar</p>
            </div>

            {error && (
              <div className="p-3 mb-6 bg-red-900/50 border border-red-700 rounded-md text-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">Authentication failed: {error}</p>
              </div>
            )}

            <div className="space-y-6">
              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-700 py-6 rounded-lg transition-all shadow-lg hover:shadow-blue-700/20"
                onClick={handleSignIn}
                disabled={isSigningIn || isRegistering}
              >
                {isSigningIn ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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
                  <span className="px-4 py-1 bg-slate-900 text-slate-500 rounded-full">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-slate-700 text-white hover:bg-slate-800 py-6 rounded-lg transition-all"
                onClick={handleRegister}
                disabled={isSigningIn || isRegistering}
              >
                {isRegistering ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Registering...
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                    </svg>
                    Register with Google
                  </>
                )}
              </Button>
            </div>

            <p className="text-sm text-center text-slate-500 mt-8">
              <span className="block">First time? Use Register to grant all permissions.</span>
              <span className="block mt-1">Returning user? Just Sign In.</span>
            </p>
          </div>
        </div>

        {/* Center divider */}
        <div className="hidden lg:flex flex-col items-center justify-center z-10">
          <div className="h-3/4 w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>
        </div>

        {/* Right section - Features */}
        <div className="hidden lg:block w-1/2 relative z-0">
          {/* Background gradient effects */}
          <div className="absolute top-20 right-20 w-72 h-72 bg-blue-600 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-purple-600 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
          
          <div className="h-full flex items-center p-12">
            <div className="w-full max-w-2xl mx-auto bg-slate-900/80 backdrop-blur-lg border border-slate-800 p-8 rounded-xl shadow-2xl">
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4">Smart Scheduler</h2>
                  <p className="text-slate-300 text-lg">
                    Leverage AI to organize your day, prioritize tasks, and optimize your calendar.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700">
                    <h3 className="font-medium text-xl text-white mb-3">Smart Scheduling</h3>
                    <p className="text-slate-400">AI-powered scheduling that learns your preferences and optimizes your day.</p>
                  </div>
                  <div className="p-5 bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700">
                    <h3 className="font-medium text-xl text-white mb-3">Task Prioritization</h3>
                    <p className="text-slate-400">Automatically arrange tasks based on deadlines and importance.</p>
                  </div>
                  <div className="p-5 bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700">
                    <h3 className="font-medium text-xl text-white mb-3">Calendar Integration</h3>
                    <p className="text-slate-400">Seamlessly integrates with your Google Calendar for a unified experience.</p>
                  </div>
                  <div className="p-5 bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700">
                    <h3 className="font-medium text-xl text-white mb-3">Time Analytics</h3>
                    <p className="text-slate-400">Insights into how you spend your time for improved productivity.</p>
                  </div>
                </div>
                
                <div className="text-center mt-8">
                  <p className="text-slate-400 text-xl">
                    Ready to transform how you manage your schedule?
                  </p>
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      <p className="ml-2 text-sm text-slate-400">Redirecting to dashboard...</p>
    </div>
  );
}
