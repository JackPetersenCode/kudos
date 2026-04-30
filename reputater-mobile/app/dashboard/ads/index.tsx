import { useCallback, useEffect, useState } from "react";
import { FlatList, View, Text, StyleSheet, ActivityIndicator, Image, Pressable, RefreshControl, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";
import { getMyAds, deleteAd, OwnerAd } from "../../../lib/ads";
import { colors } from "../../../lib/theme";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#f1f5f9", color: colors.textMuted },
  pending_review: { bg: "#fef3c7", color: "#b45309" },
  active: { bg: "#dcfce7", color: colors.success },
  paused: { bg: "#fed7aa", color: "#c2410c" },
  rejected: { bg: "#fee2e2", color: colors.danger },
};

export default function AdsListScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [ads, setAds] = useState<OwnerAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMyAds();
      setAds(data);
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

  const handleDelete = (ad: OwnerAd) => {
    Alert.alert("Delete this ad?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAd(ad.id);
            setAds((prev) => prev.filter((a) => a.id !== ad.id));
          } catch (e: any) {
            Alert.alert("Couldn't delete", e?.message || "Try again");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "My Ads" }} />
      <FlatList
        data={ads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.intro}>Create and manage sponsored placements for your businesses.</Text>
            <Pressable style={styles.createBtn} onPress={() => router.push("/dashboard/ads/new")}>
              <Text style={styles.createBtnText}>+ Create Ad</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/dashboard/ads/${item.id}`)}>
              {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.statusBadge, { backgroundColor: sc.bg, color: sc.color }]}>
                    {item.status.replace("_", " ")}
                  </Text>
                </View>
                {item.headline && <Text style={styles.headline} numberOfLines={1}>{item.headline}</Text>}
                <Text style={styles.business}>{item.businessName}</Text>
                <Text style={styles.created}>Created {new Date(item.createdAtUtc).toLocaleDateString()}</Text>
                <View style={styles.actions}>
                  <Pressable onPress={() => handleDelete(item)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No ads yet</Text>
            <Text style={styles.emptyText}>Create your first ad to start promoting your business.</Text>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  intro: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  createBtn: {
    backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 999, alignItems: "center",
  },
  createBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  card: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: "hidden",
  },
  image: { width: "100%", height: 140, backgroundColor: colors.border },
  body: { padding: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  title: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  statusBadge: {
    fontSize: 11, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: "hidden", textTransform: "capitalize",
  },
  headline: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  business: { fontSize: 12, color: colors.textMuted },
  created: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  actions: { flexDirection: "row", gap: 16, marginTop: 10 },
  deleteText: { color: colors.danger, fontWeight: "600", fontSize: 13 },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
  emptyText: { color: colors.textMuted, textAlign: "center" },
});
