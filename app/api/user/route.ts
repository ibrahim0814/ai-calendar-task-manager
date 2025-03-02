import { NextResponse } from "next/server"
import { auth } from "../../../lib/auth"

export async function GET() {
  try {
    console.log("User API - Auth function called");
    const session = await auth();
    console.log("User API - Session exists:", !!session);
    
    if (!session) {
      console.log("User API - No session found, returning 401");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Debug: Log user data
    console.log("User API - Returning user data:", {
      name: session.user?.name,
      email: session.user?.email,
      hasImage: !!session.user?.image
    });

    // Return user object to be used by the auth provider
    return NextResponse.json({
      user: {
        id: session.user?.id || session.user?.email || "",
        name: session.user?.name,
        email: session.user?.email,
        image: session.user?.image,
      }
    });
  } catch (error) {
    console.error("User API - Error fetching user data:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
