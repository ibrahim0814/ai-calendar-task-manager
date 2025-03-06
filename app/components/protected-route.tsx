"use client";

import { useAuth } from "../providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const redirectAttemptedRef = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout>();

  // Set isClient to true on component mount
  useEffect(() => {
    setIsClient(true);

    // Cleanup function
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Handle authentication state changes
  useEffect(() => {
    // Only proceed if we're on the client side
    if (!isClient) return;

    // Clear any existing redirect timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    // If we're not loading and there's no user, redirect to auth page
    if (!loading && !user && !redirectAttemptedRef.current) {
      console.log(
        "Protected route - No user detected, redirecting to auth page"
      );
      redirectAttemptedRef.current = true;

      // Add a small delay to prevent immediate redirect and potential loops
      redirectTimeoutRef.current = setTimeout(() => {
        const currentPath = window.location.pathname;
        // Only redirect if we're not already on the auth page
        if (currentPath !== "/auth") {
          router.replace("/auth");
        }
      }, 100);
    }

    // If we have a user and we're on the auth page, redirect to home
    if (!loading && user) {
      const currentPath = window.location.pathname;
      if (currentPath === "/auth") {
        router.replace("/");
      }
    }
  }, [user, loading, router, isClient]);

  // Show loading state
  if (loading || !isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="ml-2 text-sm text-slate-500">
          Loading authentication state...
        </p>
      </div>
    );
  }

  // If we have a user, show the protected content
  if (user) {
    return <>{children}</>;
  }

  // Show loading state while redirect happens
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      <p className="ml-2 text-sm text-slate-500">Redirecting to login...</p>
    </div>
  );
}
