"use client"

import { AuthProvider } from "../providers/auth-provider";
import { QueryProvider } from "../providers/query-provider";
import React from "react"
import { ThemeProvider } from "next-themes"
import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </SessionProvider>
  )
}
