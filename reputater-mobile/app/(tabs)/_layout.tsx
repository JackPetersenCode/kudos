import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function icon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <MaterialCommunityIcons name={name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: "900" },
        tabBarStyle: { backgroundColor: colors.primary, borderTopColor: "transparent" },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ headerShown: false, tabBarLabel: "Home", tabBarIcon: icon("home-variant") }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarLabel: "Search", tabBarIcon: icon("magnify") }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: "Leaderboard", tabBarLabel: "Leaderboard", tabBarIcon: icon("trophy-variant") }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Account", tabBarLabel: "Account", tabBarIcon: icon("account") }}
      />
    </Tabs>
  );
}
