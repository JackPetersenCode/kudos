import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useAuth } from "../../../../contexts/AuthContext";
import { getOwnedBusiness, getBusinessAnalytics, BusinessAnalytics } from "../../../../lib/businessOwner";
import { colors } from "../../../../lib/theme";

export default function BusinessAnalyticsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated, isReady } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!slug) return;
    (async () => {
      try {
        const biz = await getOwnedBusiness(slug);
        setBusinessName(biz.name);
        const data = await getBusinessAnalytics(biz.id);
        setAnalytics(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [isReady, isAuthenticated, slug]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>No analytics available.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `${businessName} · Analytics` }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.statsGrid}>
          <Stat label="Total Reviews" value={String(analytics.totalReviews)} />
          <Stat label="Avg Rating" value={Number(analytics.averageRating).toFixed(1)} />
          <Stat label="Check-Ins" value={String(analytics.totalCheckIns)} />
          <Stat label="Favorites" value={String(analytics.totalFavorites)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Reviews by Month</Text>
          {analytics.reviewsByMonth.length === 0 ? (
            <Text style={styles.empty}>No review data yet.</Text>
          ) : (
            analytics.reviewsByMonth.map((row) => (
              <View key={row.month} style={styles.row}>
                <Text style={styles.rowLabel}>{row.month}</Text>
                <Text style={styles.rowValue}>
                  {row.count} review{row.count === 1 ? "" : "s"}
                  <Text style={styles.rowMeta}>  · avg {Number(row.averageRating).toFixed(1)}</Text>
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Top Positive Tags</Text>
          {analytics.tagBreakdown.length === 0 ? (
            <Text style={styles.empty}>No tag data yet.</Text>
          ) : (
            analytics.tagBreakdown.map((row) => (
              <View key={row.tagName} style={styles.row}>
                <Text style={[styles.rowLabel, { textTransform: "capitalize" }]}>{row.tagName}</Text>
                <Text style={styles.rowValue}>{row.count}</Text>
              </View>
            ))
          )}
        </View>

        {analytics.staffLeaderboard.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>Staff Leaderboard</Text>
            {analytics.staffLeaderboard.map((m, i) => (
              <View key={m.id} style={styles.row}>
                <Text style={styles.rowLabel}>
                  <Text style={{ fontWeight: "800" }}>#{i + 1}</Text>  {m.firstName} {m.lastName}
                </Text>
                <Text style={styles.rowValue}>{m.kudosCount} reviews</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statBox: {
    width: "48%", backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: "center",
  },
  statValue: { fontSize: 28, fontWeight: "900", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  section: {
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 12,
  },
  h2: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.text, fontSize: 13, flex: 1 },
  rowValue: { color: colors.text, fontWeight: "700", fontSize: 13 },
  rowMeta: { color: colors.textMuted, fontWeight: "400" },
  empty: { color: colors.textMuted, fontSize: 13 },
});
