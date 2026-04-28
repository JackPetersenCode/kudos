import { useEffect, useState } from "react";
import { ScrollView, Text, View, Image, ActivityIndicator, StyleSheet, Linking, Pressable } from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { getBusiness, getBusinessReviews, getBusinessPhotos, PublicBusiness, Review } from "../../lib/publicBusiness";
import { useAuth } from "../../contexts/AuthContext";
import { getTaterLevel } from "../../lib/taterLevel";
import { addFavorite, removeFavorite, getFavoriteStatus, checkIn, getCheckInCount } from "../../lib/features";
import { colors } from "../../lib/theme";

const PLACEHOLDER = "https://pub-e3a9c8c4ae654841ba1d956cb83dc898.r2.dev/placeholders/default.jpg";

export default function BusinessDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [photos, setPhotos] = useState<{ id: string; originalUrl: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [checkInCount, setCheckInCount] = useState(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const biz = await getBusiness(slug);
        setBusiness(biz);
        const [reviewData, photoData, checkinData] = await Promise.all([
          getBusinessReviews(biz.id).catch(() => ({ reviews: [], reviewCount: 0 })),
          getBusinessPhotos(biz.id).catch(() => []),
          getCheckInCount(biz.id).catch(() => ({ totalCheckIns: 0, uniqueUsers: 0 })),
        ]);
        setReviews(reviewData.reviews);
        setPhotos(photoData);
        setCheckInCount(checkinData.totalCheckIns);

        // Check favorite status (auth required, may fail silently)
        if (isAuthenticated) {
          getFavoriteStatus(biz.id)
            .then((s) => setIsFavorited(s.isFavorited))
            .catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.textSecondary }}>Business not found.</Text>
      </View>
    );
  }

  const photoUrl = photos[0]?.originalUrl || PLACEHOLDER;

  return (
    <>
      <Stack.Screen options={{ title: business.name }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Image source={{ uri: photoUrl }} style={styles.heroPhoto} />

        <View style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{business.name}</Text>
            <Text style={[styles.tag, business.isOpenNow ? styles.tagOpen : styles.tagClosed]}>
              {business.isOpenNow ? "Open" : "Closed"}
            </Text>
          </View>

          {business.description && (
            <Text style={styles.description}>{business.description}</Text>
          )}

          <View style={styles.contactRow}>
            {business.phone && (
              <Pressable style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${business.phone}`)}>
                <Text style={styles.contactText}>📞 {business.phone}</Text>
              </Pressable>
            )}
            {business.websiteUrl && (
              <Pressable style={styles.contactBtn} onPress={() => Linking.openURL(business.websiteUrl!)}>
                <Text style={styles.contactText}>🌐 Website</Text>
              </Pressable>
            )}
          </View>

          {(business.address1 || business.city) && (
            <Text style={styles.address}>
              📍 {[business.address1, business.city, business.state, business.postalCode].filter(Boolean).join(", ")}
            </Text>
          )}

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, isFavorited && styles.actionBtnActive]}
              onPress={async () => {
                if (!business) return;
                if (!isAuthenticated) { router.push("/login"); return; }
                try {
                  if (isFavorited) {
                    await removeFavorite(business.id);
                    setIsFavorited(false);
                  } else {
                    await addFavorite(business.id);
                    setIsFavorited(true);
                  }
                } catch { /* ignore */ }
              }}
            >
              <Text style={[styles.actionBtnText, isFavorited && styles.actionBtnTextActive]}>
                {isFavorited ? "♥ Saved" : "♡ Save"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.actionBtn}
              onPress={async () => {
                if (!business) return;
                if (!isAuthenticated) { router.push("/login"); return; }
                try {
                  await checkIn(business.id);
                  const counts = await getCheckInCount(business.id);
                  setCheckInCount(counts.totalCheckIns);
                } catch { /* ignore */ }
              }}
            >
              <Text style={styles.actionBtnText}>📍 Check In{checkInCount > 0 ? ` · ${checkInCount}` : ""}</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.reviewBtn}
            onPress={() => {
              if (!isAuthenticated) {
                router.push("/login");
                return;
              }
              router.push(`/write-review/${slug}`);
            }}
          >
            <Text style={styles.reviewBtnText}>✏️  Write a Review</Text>
          </Pressable>
        </View>

        {photos.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {photos.slice(0, 10).map((p) => (
                <Image key={p.id} source={{ uri: p.originalUrl }} style={styles.thumb} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          {reviews.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No reviews yet — be the first!</Text>
          ) : (
            reviews.slice(0, 10).map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <Text style={styles.reviewName}>{r.displayName}</Text>
                    <View style={styles.taterBadge}>
                      <Image source={{ uri: getTaterLevel(r.userReviewCount).image }} style={{ width: 14, height: 14 }} />
                      <Text style={styles.taterBadgeText}>{getTaterLevel(r.userReviewCount).name}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>{new Date(r.createdAtUtc).toLocaleDateString()}</Text>
                </View>
                {r.positiveTags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {r.positiveTags.map((tag) => (
                      <Text key={tag} style={styles.reviewTag}>{tag}</Text>
                    ))}
                  </View>
                )}
                {r.title && <Text style={styles.reviewTitle}>{r.title}</Text>}
                {r.body && <Text style={styles.reviewBody}>{r.body}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  heroPhoto: { width: "100%", height: 220, backgroundColor: colors.border },
  section: { padding: 16, backgroundColor: colors.surface, marginBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, flex: 1 },
  tag: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, fontWeight: "600", overflow: "hidden" },
  tagOpen: { backgroundColor: "#ecfdf5", color: colors.success },
  tagClosed: { backgroundColor: "#f1f5f9", color: colors.textMuted },
  description: { color: colors.textSecondary, marginTop: 8, lineHeight: 22 },
  contactRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  contactBtn: { backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  contactText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  address: { color: colors.textSecondary, marginTop: 12, fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  thumb: { width: 120, height: 120, borderRadius: 8, backgroundColor: colors.border },
  reviewCard: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewName: { fontWeight: "700", color: colors.text, fontSize: 14 },
  reviewDate: { color: colors.textMuted, fontSize: 12 },
  tagsRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  reviewTag: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "#fff7e6", color: colors.accent, fontWeight: "600", overflow: "hidden" },
  reviewTitle: { fontWeight: "700", color: colors.text, marginTop: 6 },
  reviewBody: { color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  reviewBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12, borderRadius: 999, marginTop: 16, alignItems: "center",
  },
  reviewBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  taterBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    backgroundColor: "#fef9eb",
  },
  taterBadgeText: { fontSize: 10, color: colors.accent, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: "center",
  },
  actionBtnActive: { backgroundColor: "#fef9eb", borderColor: colors.accent },
  actionBtnText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  actionBtnTextActive: { color: colors.accent },
});
