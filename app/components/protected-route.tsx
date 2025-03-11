"use client";

import { useAuth } from "../providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true on component mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle authentication state changes
  useEffect(() => {
    if (!isClient || loading) return;

    const currentPath = window.location.pathname;

    if (!user && currentPath !== "/auth") {
      router.push("/auth");
      return;
    }

    if (user && currentPath === "/auth") {
      router.push("/");
    }
  }, [user, loading, router, isClient]);

  // Don't render anything on the server
  if (!isClient) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="ml-2 text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  // If we have a user, show the protected content
  if (user) {
    return <>{children}</>;
  }

  // Show loading state while redirect happens
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      <p className="ml-2 text-sm text-slate-500">Redirecting...</p>
    </div>
  );
}
