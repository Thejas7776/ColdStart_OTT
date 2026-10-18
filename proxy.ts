
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  const isAdminPage =
    path === "/admin" || path.startsWith("/admin/");
  const isAdminLogin = path === "/admin-login";

  const isProtectedPage =
    path === "/home" ||
    path.startsWith("/home/") ||
    path === "/movies" ||
    path.startsWith("/movies/");

  const isAuthPage = path === "/login" || path === "/signup";

  // Verify the user's Supabase session.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user && !authError;

  // Protect the movie homepage and movie pages.
  if (isProtectedPage && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Protect the admin dashboard.
  if (isAdminPage && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin-login";
    return NextResponse.redirect(url);
  }

  // Only administrators can access admin pages.
  if (isAdminPage && isLoggedIn) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin-login";
      return NextResponse.redirect(url);
    }
  }

  // Redirect an already signed-in administrator from admin login.
  if (isAdminLogin && isLoggedIn) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileError && profile?.role === "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  // Keep signed-in users away from signup and regular login.
  if (isAuthPage && isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/home/:path*",
    "/movies/:path*",
    "/admin/:path*",
    "/admin-login",
    "/login",
    "/signup",
  ],
};
