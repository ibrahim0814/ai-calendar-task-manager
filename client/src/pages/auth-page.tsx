import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiGoogle } from "react-icons/si";
import { Redirect } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function AuthPage() {
  const { user } = useAuth();
  const error = new URLSearchParams(window.location.search).get('error');

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Welcome</h1>
            <p className="text-muted-foreground">Sign in to manage your calendar</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Authentication failed: {decodeURIComponent(error)}
              </AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={() => window.location.href = "/api/auth/google"}
          >
            <SiGoogle className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
        </div>
      </div>

      <div className="hidden lg:block bg-muted/50"> 
        <div className="h-full flex items-center justify-center p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">AI Calendar Assistant</h2>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="bg-primary h-2 w-2 rounded-full mr-2" />
                Natural language task input
              </li>
              <li className="flex items-center">
                <span className="bg-primary h-2 w-2 rounded-full mr-2" />
                Automatic scheduling
              </li>
              <li className="flex items-center">
                <span className="bg-primary h-2 w-2 rounded-full mr-2" />
                Google Calendar sync
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}