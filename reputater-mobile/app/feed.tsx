import { useCallback, useEffect, useState } from "react";
import { FlatList, View, Text, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { getActivityFeed, FeedItem } from "../lib/features";
import { colors } from "../lib/theme";

export default function FeedScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getActivityFeed();
      setItems(data);
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
    load().finally(() => setLoading(false));
  }, [isReady, isAuthenticated, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
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
      <Stack.Screen options={{ title: "Activity Feed" }} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <Text style={styles.intro}>Recent reviews from businesses you&apos;ve saved.</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/business/${item.businessSlug}`)}>
            <Text style={styles.business}>{item.businessName}</Text>
            <Text style={styles.rating}>
              {Array.from({ length: item.rating }).map(() => "★").join("")}
              <Text style={styles.ratingMuted}>
                {Array.from({ length: 5 - item.rating }).map(() => "★").join("")}
              </Text>
              <Text style={styles.byline}>  by {item.reviewerEmail.split("@")[0]}</Text>
            </Text>
            {item.title && <Text style={styles.title}>{item.title}</Text>}
            {item.body && <Text style={styles.body} numberOfLines={3}>{item.body}</Text>}
            <Text style={styles.date}>{new Date(item.createdAtUtc).toLocaleString()}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No activity yet. Save some businesses to see their reviews here.</Text>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  intro: { color: colors.textSecondary, marginBottom: 12, fontSize: 13 },
  card: {
    backgroundColor: colors.surface, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  business: { fontSize: 15, fontWeight: "700", color: colors.accent },
  rating: { color: colors.accent, fontSize: 14, marginTop: 6, letterSpacing: 1 },
  ratingMuted: { color: colors.border },
  byline: { color: colors.textMuted, fontSize: 12, fontWeight: "400", letterSpacing: 0 },
  title: { fontWeight: "700", color: colors.text, marginTop: 6, fontSize: 14 },
  body: { color: colors.textSecondary, marginTop: 4, fontSize: 13, lineHeight: 18 },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 8 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
