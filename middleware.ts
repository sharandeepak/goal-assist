import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes accessible to unauthenticated users
const AUTH_ROUTES = [
  "/auth/signin",
  "/auth/signup",
  "/auth/callback",
  "/auth/forgot-password",
  "/auth/reset-password",
];

// Routes that should NOT redirect away even when logged in
// (reset-password needs an active session to call updateUser)
const ALWAYS_ACCESSIBLE_AUTH_ROUTES = ["/auth/reset-password"];
const ONBOARDING_ROUTE = "/onboarding";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  // Supabase PKCE password-reset links land on the site root with ?code=&next=
  // Forward them to /auth/callback so the code is exchanged for a session.
  const pkceCode = searchParams.get("code");
  if (pkceCode && !pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isOnboardingRoute = pathname.startsWith(ONBOARDING_ROUTE);

  if (!user && !isAuthRoute && !isOnboardingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  if (!user && isOnboardingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  const isAlwaysAccessible = ALWAYS_ACCESSIBLE_AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (user && isAuthRoute && !isAlwaysAccessible) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|target.svg|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
