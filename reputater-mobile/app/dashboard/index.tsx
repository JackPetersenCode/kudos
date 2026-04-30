import { useCallback, useEffect, useState } from "react";
import { FlatList, View, Text, StyleSheet, ActivityIndicator, Pressable, RefreshControl, ScrollView } from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { getOwnedBusinesses, OwnedBusiness } from "../../lib/businessOwner";
import { colors } from "../../lib/theme";

export default function BusinessDashboardListScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [businesses, setBusinesses] = useState<OwnedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getOwnedBusinesses();
      setBusinesses(data);
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
      <Stack.Screen options={{ title: "My Businesses" }} />
      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View style={{ paddingBottom: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Pressable style={styles.quickLink} onPress={() => router.push("/feed")}>
                <Text style={styles.quickLinkText}>📰  Activity Feed</Text>
              </Pressable>
              <Pressable style={styles.quickLink} onPress={() => router.push("/dashboard/ads")}>
                <Text style={styles.quickLinkText}>📢  Manage Ads</Text>
              </Pressable>
              <Pressable style={styles.quickLink} onPress={() => router.push("/favorites")}>
                <Text style={styles.quickLinkText}>♥  Saved</Text>
              </Pressable>
            </ScrollView>
            <Pressable style={styles.addBtn} onPress={() => router.push("/add-business")}>
              <Text style={styles.addBtnText}>+ Add a Business</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/dashboard/business/${item.slug}`)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.location}>
              {[item.city, item.state].filter(Boolean).join(", ") || "Location not listed"}
            </Text>
            <Text style={styles.role}>Role: {item.membershipRole}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No businesses yet</Text>
            <Text style={styles.emptyText}>
              Claim an existing business or visit reputater.com to add a new one.
            </Text>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  location: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  role: { fontSize: 12, color: colors.textMuted, marginTop: 6, textTransform: "capitalize" },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
  emptyText: { color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  quickLink: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  quickLinkText: { fontSize: 13, fontWeight: "600", color: colors.text },
  addBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 999, alignItems: "center",
    backgroundColor: colors.accent,
  },
  addBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
});
