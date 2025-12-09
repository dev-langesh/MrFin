import { NextResponse } from "next/server";

const privateRoutes = ["/dashboard"];

export async function middleware(req) {
  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;

  function redirectToLoginPage() {
    return NextResponse.redirect(
      new URL("/auth/login/?redirectUrl=" + req.url, req.url)
    );
  }

  const isPrivateRoute = privateRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  if (isPrivateRoute && (!accessToken || !refreshToken))
    return redirectToLoginPage();

  return NextResponse.next();
}

export const config = {
  matcher: privateRoutes.map((route) => route + "/:path*"),
};
