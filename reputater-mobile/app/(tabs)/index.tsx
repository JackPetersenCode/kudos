import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, StyleSheet, Image, RefreshControl, Pressable } from "react-native";
import { router } from "expo-router";
import { searchBusinesses, SearchResult } from "../../lib/publicBusiness";
import BusinessCard from "../../components/BusinessCard";
import SponsoredBanner from "../../components/SponsoredBanner";
import { ListSkeleton } from "../../components/Skeleton";
import { CATEGORY_TREE } from "../../lib/categoryTree";
import { colors } from "../../lib/theme";

const CATEGORY_GROUP_ICONS: Record<string, string> = {
  "food-drink": "🍽",
  "shopping": "🛍",
  "health-beauty": "💆",
  "home-auto": "🔧",
  "professional-services": "💼",
  "entertainment-recreation": "🎉",
};

export default function HomeScreen() {
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await searchBusinesses({ pageSize: 10 });
      setTrending(data.results);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} />
        <Text style={styles.heroTitle}>Discover businesses that</Text>
        <Text style={[styles.heroTitle, { color: colors.accent }]}>deserve recognition</Text>
        <Text style={styles.heroSubtitle}>
          Reputater is where great businesses get the praise they earn.
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        <SponsoredBanner placementSlug="homepage-banner" pagePath="/" />

        <Text style={styles.sectionTitle}>Browse by category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORY_TREE.map((group) => (
            <Pressable
              key={group.slug}
              style={styles.categoryCard}
              onPress={() => router.push(`/(tabs)/search?category=${encodeURIComponent(group.slug)}`)}
            >
              <Text style={styles.categoryIcon}>{CATEGORY_GROUP_ICONS[group.slug] ?? "🏷"}</Text>
              <Text style={styles.categoryName}>{group.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Featured Businesses</Text>
        {loading ? (
          <ListSkeleton count={4} />
        ) : (
          trending.map((b) => <BusinessCard key={b.id} business={b} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logo: { width: 60, height: 78, marginBottom: 16 },
  heroTitle: { color: "white", fontSize: 24, fontWeight: "900", textAlign: "center" },
  heroSubtitle: { color: "rgba(255,255,255,0.7)", marginTop: 12, textAlign: "center", fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryCard: {
    width: "31%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  categoryIcon: { fontSize: 24, marginBottom: 6 },
  categoryName: { fontSize: 11, fontWeight: "700", color: colors.text, textAlign: "center" },
});
