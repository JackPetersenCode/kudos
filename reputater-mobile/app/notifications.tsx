import { useCallback, useEffect, useState } from "react";
import { FlatList, View, Text, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { getNotifications, markNotificationsRead, Notification } from "../lib/features";
import { colors } from "../lib/theme";

export default function NotificationsScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (markRead: boolean) => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      if (markRead) markNotificationsRead().catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    load(true).finally(() => setLoading(false));
  }, [isReady, isAuthenticated, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Notifications" }} />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.isRead && styles.cardUnread]}>
            <Text style={styles.subject}>{item.subject}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.date}>{new Date(item.createdAtUtc).toLocaleDateString()}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No notifications yet.</Text>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  cardUnread: { borderColor: colors.accent, backgroundColor: "#fef9eb" },
  subject: { fontWeight: "700", color: colors.text, fontSize: 14 },
  body: { color: colors.textSecondary, marginTop: 4, fontSize: 13, lineHeight: 18 },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
