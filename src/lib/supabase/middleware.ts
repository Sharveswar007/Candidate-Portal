
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// HR Portal URL (separate project on different port)
const HR_PORTAL_URL = "http://localhost:3001";

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refreshing the auth token
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Protected routes that require authentication (Candidate Portal only)
    const protectedPaths = [
        "/dashboard",
        "/assessment",
        "/results",
        "/candidate",
        "/jobs",
    ];

    const isProtectedRoute = !pathname.startsWith("/api") &&
        protectedPaths.some(path => pathname.startsWith(path));

    if (isProtectedRoute && !user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Role-based access control & Onboarding Gatekeeper
    if (user) {
        // Get user role and onboarding status
        const { data: profile } = await supabase
            .from("profiles")
            .select("role, onboarding_complete")
            .eq("id", user.id)
            .single();

        const userRole = profile?.role;
        const isOnboardingComplete = profile?.onboarding_complete === true;

        // -------------------------------------------------------------
        // RECRUITER REDIRECT: Send recruiters to the HR Portal (port 3001)
        // Only redirect if role is EXPLICITLY 'recruiter'
        // -------------------------------------------------------------
        if (userRole === "recruiter") {
            // If recruiter tries to access any /recruiter route on port 3000, redirect to HR Portal
            if (pathname.startsWith("/recruiter")) {
                return NextResponse.redirect(new URL(HR_PORTAL_URL));
            }
            // If recruiter tries to access candidate-specific routes, redirect to HR Portal
            if (pathname.startsWith("/candidate")) {
                return NextResponse.redirect(new URL(HR_PORTAL_URL));
            }
        }

        // -------------------------------------------------------------
        // CANDIDATE ONBOARDING ENFORCEMENT
        // Treat null/undefined role as "candidate" (default for new users)
        // -------------------------------------------------------------
        const isApiOrAuth = pathname.startsWith("/api") || pathname.startsWith("/auth");
        const isCandidateOnboarding = pathname === "/candidate/onboarding";
        const isCandidate = userRole === "candidate" || !userRole; // Default to candidate

        if (isCandidate && !isOnboardingComplete && !isApiOrAuth) {
            if (!isCandidateOnboarding) {
                return NextResponse.redirect(new URL("/candidate/onboarding", request.url));
            }
        }

        // Prevent re-entry to onboarding if already completed
        if (isCandidate && isOnboardingComplete && isCandidateOnboarding) {
            return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
        }

        // Redirect old /dashboard route
        if (pathname === "/dashboard") {
            return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
        }
    }

    // Redirect logged-in users away from auth pages
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
        if (user) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            const userRole = profile?.role || "candidate";

            if (userRole === "recruiter") {
                // Redirect recruiters to HR Portal
                return NextResponse.redirect(new URL(HR_PORTAL_URL));
            }
            return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
        }
    }

    return response;
}
