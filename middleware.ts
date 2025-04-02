import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  // Get the pathname
  const { pathname } = req.nextUrl;

  // Check if the user is authenticated and trying to access the auth page
  if (token && pathname === "/auth") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

// Specify which paths the middleware should run on
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
