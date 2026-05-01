import { useEffect, useState } from "react";
import { ScrollView, View, Text, Switch, StyleSheet, ActivityIndicator, Alert, Platform } from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { getNotificationPreferences, updateNotificationPreferences, NotificationPreferences } from "../lib/features";
import { colors } from "../lib/theme";

const FIELDS: { key: keyof NotificationPreferences; title: string; description: string }[] = [
  {
    key: "emailOnNewReview",
    title: "New reviews on your business",
    description: "Email me when someone reviews a business I own.",
  },
  {
    key: "emailOnReviewResponse",
    title: "Owner responses to my reviews",
    description: "Email me when a business owner replies to a review I wrote.",
  },
  {
    key: "emailOnNewKudos",
    title: "Staff kudos on my business",
    description: "Email me when a customer gives kudos to one of my staff members.",
  },
  {
    key: "emailOnFavoriteActivity",
    title: "Activity from saved businesses",
    description: "Email me a periodic digest of new reviews on businesses I've saved.",
  },
];

export default function NotificationPreferencesScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    getNotificationPreferences()
      .then(setPrefs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isReady, isAuthenticated]);

  const toggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    try {
      await updateNotificationPreferences(next);
    } catch (e: any) {
      // Revert on failure
      setPrefs(prefs);
      Alert.alert("Couldn't save", e?.message || "Try again");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Notifications" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.intro}>
          Choose which emails you&apos;d like to receive from Reputater.
          {saving ? "  ·  Saving…" : ""}
        </Text>

        <View style={styles.card}>
          {FIELDS.map((f, i) => (
            <View key={f.key}>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.title}>{f.title}</Text>
                  <Text style={styles.description}>{f.description}</Text>
                </View>
                <Switch
                  value={prefs[f.key]}
                  onValueChange={(v) => toggle(f.key, v)}
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                />
              </View>
              {i < FIELDS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  intro: { color: colors.textSecondary, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  card: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", padding: 16 },
  title: { fontWeight: "700", color: colors.text, fontSize: 14 },
  description: { color: colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
});
