import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/public"];
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  "placeholder-anon-key";

function getAllowedEmails() {
  const raw = process.env.ALLOWED_LOGIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some(
    (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`),
  );
  const isLoginPath = path === "/login";
  const allowedEmails = getAllowedEmails();
  const sessionEmail = session?.user?.email?.toLowerCase();
  const isAllowedUser =
    allowedEmails.length === 0 ||
    (typeof sessionEmail === "string" && allowedEmails.includes(sessionEmail));

  if (!isPublicPath && session && !isAllowedUser) {
    await supabase.auth.signOut();
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set(
      "error",
      "This account is not allowed to access this app.",
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoginPath && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isPublicPath && !session) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
