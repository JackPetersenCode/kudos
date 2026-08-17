import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { useNotificationTapRouter } from "../lib/useNotificationTapRouter";

export default function RootLayout() {
  // Route to the right screen when the app is opened from a tapped notification.
  useNotificationTapRouter();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: "#1a1a2e" },
              headerTintColor: "#f0a500",
              headerTitleStyle: { fontWeight: "900" },
              contentStyle: { backgroundColor: "#fafbfc" },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ title: "Sign in" }} />
            <Stack.Screen name="register" options={{ title: "Create account" }} />
            <Stack.Screen name="forgot-password" options={{ title: "Forgot Password" }} />
            <Stack.Screen name="business/[slug]" options={{ title: "Business" }} />
            <Stack.Screen name="profile/[userId]" options={{ title: "Profile" }} />
            <Stack.Screen name="my-reviews" options={{ title: "My Reviews" }} />
            <Stack.Screen name="edit-profile" options={{ title: "Edit Profile" }} />
            <Stack.Screen name="favorites" options={{ title: "Saved" }} />
            <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
            <Stack.Screen name="feed" options={{ title: "Feed" }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
