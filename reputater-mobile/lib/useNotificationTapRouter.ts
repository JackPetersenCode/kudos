import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

// Map a push notification's data payload to an in-app route. The backend sends
// { type, ... } — see PushNotificationService callers (ad_review, claim_approved,
// new_review). Unknown/missing types fall back to the notifications screen.
function routeFor(data: unknown): string {
  if (!data || typeof data !== "object") return "/notifications";
  const d = data as Record<string, unknown>;
  switch (d.type) {
    case "claim_approved":
      return typeof d.businessSlug === "string" && d.businessSlug
        ? `/business/${d.businessSlug}`
        : "/notifications";
    case "ad_review":
      return "/dashboard/ads";
    case "new_review":
    default:
      return "/notifications";
  }
}

/**
 * Navigates when the app is opened from a tapped push notification. Handles both
 * warm taps (app running/backgrounded) and cold start, via useLastNotificationResponse.
 * Guards on the notification identifier so a given tap only routes once.
 */
export function useNotificationTapRouter() {
  const response = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handledId.current === id) return;
    handledId.current = id;

    const path = routeFor(response.notification.request.content.data);
    // Defer a tick so the navigator is mounted when opened from a cold start.
    setTimeout(() => router.push(path as never), 0);
  }, [response]);
}
