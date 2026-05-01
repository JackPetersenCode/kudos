import { NextResponse } from "next/server";

// Apple Universal Links: served as application/json (no extension, no charset).
// File requested at: https://reputater.com/.well-known/apple-app-site-association
// Replace TEAMID with your Apple Developer Team ID before submitting to App Store.
export function GET() {
  const aasa = {
    applinks: {
      details: [
        {
          appIDs: ["TEAMID.com.reputater.app"],
          components: [
            { "/": "/reset-password*", comment: "Password reset deep links open the app" },
            { "/": "/verify-email*", comment: "Email verification deep links open the app" },
            { "/": "/business/*", comment: "Business detail pages open the app" },
            { "/": "/profile/*", comment: "User profile pages open the app" },
          ],
        },
      ],
    },
  };

  return new NextResponse(JSON.stringify(aasa), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
