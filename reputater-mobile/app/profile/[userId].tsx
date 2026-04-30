import { useEffect, useState } from "react";
import { ScrollView, View, Text, Image, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { getPublicProfile, PublicProfile } from "../../lib/auth";
import { getTaterLevel } from "../../lib/taterLevel";
import { colors } from "../../lib/theme";

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getPublicProfile(userId)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>User not found.</Text>
      </View>
    );
  }

  const level = getTaterLevel(profile.reviewCount);

  return (
    <>
      <Stack.Screen options={{ title: profile.displayName }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.displayName[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile.displayName}</Text>

          <View style={styles.levelBadge}>
            <Image source={{ uri: level.image }} style={styles.levelImage} />
            <Text style={styles.levelName}>{level.name}</Text>
          </View>

          <Text style={styles.joinedAt}>
            Joined {new Date(profile.joinedAtUtc).toLocaleDateString()}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{profile.reviewCount}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{profile.checkinCount}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{profile.badges.length}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>
        </View>

        {profile.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <View style={styles.badgesRow}>
              {profile.badges.map((b) => (
                <Text key={b.badgeKey} style={styles.badge}>{b.badgeLabel}</Text>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {profile.recentReviews.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No reviews yet.</Text>
          ) : (
            profile.recentReviews.map((r) => (
              <Pressable
                key={r.id}
                style={styles.reviewCard}
                onPress={() => router.push(`/business/${r.businessSlug}`)}
              >
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewBusiness} numberOfLines={1}>{r.businessName}</Text>
                  <Text style={styles.reviewDate}>{new Date(r.createdAtUtc).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.rating}>
                  {Array.from({ length: r.rating }).map(() => "★").join("")}
                  <Text style={styles.ratingMuted}>
                    {Array.from({ length: 5 - r.rating }).map(() => "★").join("")}
                  </Text>
                </Text>
                {r.title && <Text style={styles.reviewTitle}>{r.title}</Text>}
                {r.body && <Text style={styles.reviewBody}>{r.body}</Text>}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  headerCard: {
    backgroundColor: colors.surface, padding: 24, alignItems: "center",
    margin: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "white" },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 8 },
  levelBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: "#fef9eb", marginBottom: 8,
  },
  levelImage: { width: 24, height: 24 },
  levelName: { fontWeight: "700", color: colors.accent, fontSize: 13 },
  joinedAt: { fontSize: 12, color: colors.textMuted, marginBottom: 14 },
  statsRow: { flexDirection: "row", gap: 32, marginTop: 8 },
  statBox: { alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  section: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 12, padding: 16,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  badgesRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: "#fef9eb", color: colors.accent, fontWeight: "600", fontSize: 12, overflow: "hidden",
  },
  reviewCard: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewBusiness: { fontWeight: "700", color: colors.accent, fontSize: 14, flex: 1, marginRight: 8 },
  reviewDate: { color: colors.textMuted, fontSize: 12 },
  rating: { color: colors.accent, fontSize: 14, marginTop: 4, letterSpacing: 1 },
  ratingMuted: { color: colors.border },
  reviewTitle: { fontWeight: "700", color: colors.text, marginTop: 6, fontSize: 14 },
  reviewBody: { color: colors.textSecondary, marginTop: 4, fontSize: 13, lineHeight: 18 },
});
