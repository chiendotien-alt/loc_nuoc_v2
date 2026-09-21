import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/admin";
  const isLoginApi = pathname === "/api/admin/login";

  const needsAuth =
    (pathname.startsWith("/admin") && !isLoginPage) ||
    (pathname.startsWith("/api/admin") && !isLoginApi);

  if (needsAuth) {
    const token = req.cookies.get("admin_token")?.value;
    if (!verifyToken(token)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
