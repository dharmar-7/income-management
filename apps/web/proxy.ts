import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Routes that require the user to be logged in
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/import(.*)', '/settings(.*)', '/savings(.*)', '/transactions(.*)', '/budgets(.*)', '/reports(.*)', '/notes(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
