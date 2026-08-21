import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, FlatList, Image, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGeolocation } from "../../hooks/useGeolocation";
import { getRecentReviews, RecentReview } from "../../lib/recentReviews";
import { addRecentView } from "../../lib/recents";
import { colors } from "../../lib/theme";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const SHORTCUTS: { slug: string; label: string; icon: IconName }[] = [
  { slug: "restaurant", label: "Restaurants", icon: "silverware-fork-knife" },
  { slug: "auto-repair", label: "Auto Repair", icon: "car-wrench" },
  { slug: "moving-company", label: "Movers", icon: "truck" },
  { slug: "plumber", label: "Plumbers", icon: "wrench" },
  { slug: "cleaning-service", label: "Cleaning", icon: "broom" },
  { slug: "coffee-shop", label: "Coffee", icon: "coffee" },
  { slug: "bar", label: "Bars", icon: "glass-cocktail" },
  { slug: "salon", label: "Salons", icon: "content-cut" },
];

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons
          key={i}
          name={i <= Math.round(rating) ? "star" : "star-outline"}
          size={size}
          color={colors.accent}
        />
      ))}
    </View>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.34, "week"], [12, "month"], [Infinity, "year"],
  ];
  let val = secs;
  let unit = "second";
  for (const [factor, name] of units) {
    if (val < factor) { unit = name; break; }
    val = Math.floor(val / factor);
    unit = name;
  }
  return `${val} ${unit}${val === 1 ? "" : "s"} ago`;
}

function ReviewCard({ review }: { review: RecentReview }) {
  const initials = review.reviewerName.trim().slice(0, 2).toUpperCase();
  function open() {
    addRecentView({ slug: review.slug, name: review.businessName, city: review.city, distanceMiles: review.distanceMiles });
    router.push(`/business/${review.slug}`);
  }
  return (
    <Pressable style={styles.card} onPress={open}>
      <View style={styles.reviewHead}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewer}>{review.reviewerName}</Text>
          <Text style={styles.timeAgo}>Posted a review · {timeAgo(review.createdAtUtc)}</Text>
        </View>
      </View>

      <View style={{ marginTop: 8 }}><Stars rating={review.rating} size={16} /></View>

      {review.body ? <Text style={styles.reviewBody} numberOfLines={3}>{review.body}</Text> : null}

      {review.reviewPhotoUrl ? (
        <Image source={{ uri: review.reviewPhotoUrl }} style={styles.reviewPhoto} />
      ) : null}

      <View style={styles.bizRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bizName} numberOfLines={1}>{review.businessName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <Stars rating={Number(review.businessAverageRating)} size={13} />
            <Text style={styles.bizMeta}>
              {Number(review.businessAverageRating).toFixed(1)} ({review.businessReviewCount})
            </Text>
          </View>
          <Text style={styles.bizMeta} numberOfLines={1}>
            {[review.topCategory, review.city].filter(Boolean).join(" · ")}
            {review.distanceMiles != null ? ` · ${Number(review.distanceMiles).toFixed(1)} mi` : ""}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const geo = useGeolocation(false);
  const [reviews, setReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getRecentReviews(geo.lat ?? undefined, geo.lng ?? undefined);
    setReviews(data);
  }, [geo.lat, geo.lng]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={reviews}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutRow}>
              {SHORTCUTS.map((s) => (
                <Pressable
                  key={s.slug}
                  style={styles.shortcut}
                  onPress={() => router.push(`/(tabs)/search?category=${s.slug}`)}
                >
                  <View style={styles.shortcutIcon}>
                    <MaterialCommunityIcons name={s.icon} size={26} color={colors.text} />
                  </View>
                  <Text style={styles.shortcutLabel} numberOfLines={1}>{s.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable style={styles.searchBar} onPress={() => router.push("/search-entry")}>
              <MaterialCommunityIcons name="magnify" size={22} color={colors.accent} />
              <Text style={styles.searchPlaceholder}>Search for restaurants, plumbers…</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Recent reviews near you</Text>
          </>
        }
        renderItem={({ item }) => <ReviewCard review={item} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              No recent reviews nearby yet — be the first to write one!
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shortcutRow: { gap: 18, paddingVertical: 4, paddingRight: 8 },
  shortcut: { alignItems: "center", width: 68 },
  shortcutIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  shortcutLabel: { fontSize: 11, fontWeight: "600", color: colors.text, textAlign: "center" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginTop: 16, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.surface, borderRadius: 999, borderWidth: 1, borderColor: colors.border,
  },
  searchPlaceholder: { color: colors.textMuted, fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 24, marginBottom: 12 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40, fontSize: 14, paddingHorizontal: 24 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 14,
  },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#3a2600", fontWeight: "800", fontSize: 14 },
  reviewer: { fontWeight: "700", fontSize: 15, color: colors.text },
  timeAgo: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  reviewBody: { marginTop: 8, fontSize: 14, color: colors.text, lineHeight: 20 },
  reviewPhoto: { width: "100%", height: 180, borderRadius: 12, marginTop: 12, backgroundColor: colors.border },
  bizRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border,
  },
  bizName: { fontSize: 15, fontWeight: "800", color: colors.text },
  bizMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
