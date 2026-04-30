import { useCallback, useEffect, useState } from "react";
import { FlatList, View, Text, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { getMe, getPublicProfile, PublicProfile } from "../lib/auth";
import { colors } from "../lib/theme";

type MyReview = PublicProfile["recentReviews"][number];

export default function MyReviewsScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await getMe();
      const profile = await getPublicProfile(me.userId);
      setReviews(profile.recentReviews);
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
      <Stack.Screen options={{ title: "My Reviews" }} />
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/business/${item.businessSlug}`)}>
            <Text style={styles.business} numberOfLines={1}>{item.businessName}</Text>
            <Text style={styles.rating}>
              {Array.from({ length: item.rating }).map(() => "★").join("")}
              <Text style={styles.ratingMuted}>
                {Array.from({ length: 5 - item.rating }).map(() => "★").join("")}
              </Text>
            </Text>
            {item.title && <Text style={styles.title}>{item.title}</Text>}
            {item.body && <Text style={styles.body} numberOfLines={3}>{item.body}</Text>}
            <Text style={styles.date}>{new Date(item.createdAtUtc).toLocaleDateString()}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>You haven&apos;t written any reviews yet.</Text>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  business: { fontSize: 15, fontWeight: "700", color: colors.text },
  rating: { color: colors.accent, fontSize: 14, marginTop: 4, letterSpacing: 1 },
  ratingMuted: { color: colors.border },
  title: { fontWeight: "700", color: colors.text, marginTop: 6, fontSize: 14 },
  body: { color: colors.textSecondary, marginTop: 4, fontSize: 13, lineHeight: 18 },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 8 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
