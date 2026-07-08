import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiFetch } from "./api";

// Foreground notification handler — show banner + sound + badge while app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission and get an Expo push token. Returns null if:
 * - running on a simulator/emulator (no push)
 * - user denied permission
 * - permission flow fails
 */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#f0a500",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn(
      "[pushNotifications] No EAS projectId found — cannot fetch Expo push token. " +
        "Run `eas init` and set extra.eas.projectId in app.json.",
    );
    return null;
  }

  try {
    // Returns Expo push token like: ExponentPushToken[xxxx]
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function registerPushToken(token: string): Promise<void> {
  await apiFetch("/profile/push-token", {
    method: "POST",
    body: JSON.stringify({
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName ?? null,
    }),
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await apiFetch("/profile/push-token", {
    method: "DELETE",
    body: JSON.stringify({ token }),
  });
}

/**
 * Call once after sign-in. Idempotent: registering the same token twice is fine.
 */
export async function setupPushNotifications(): Promise<string | null> {
  const token = await getPushToken();
  if (!token) return null;
  try {
    await registerPushToken(token);
  } catch {
    // Token registration failure isn't fatal — user just won't get push
  }
  return token;
}
