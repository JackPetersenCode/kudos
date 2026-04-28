import { useEffect, useState } from "react";
import { FlatList, View, Text, Image, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { getLeaderboard, LeaderboardEntry } from "../../lib/leaderboard";
import { colors } from "../../lib/theme";

const RANK_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"];

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then(setEntries).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />;
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.subtitle}>The most recognized employees ranked by total reviews received.</Text>
        </View>
      }
      ListEmptyComponent={<Text style={{ textAlign: "center", color: colors.textMuted }}>No staff reviews yet.</Text>}
      renderItem={({ item, index }) => {
        const rank = index + 1;
        const initials = `${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`.toUpperCase();
        return (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/business/${item.businessSlug}`)}
          >
            <View
              style={[
                styles.rank,
                rank <= 3 && { backgroundColor: RANK_COLORS[rank - 1] },
              ]}
            >
              <Text style={[styles.rankText, rank <= 3 && { color: "white" }]}>{rank}</Text>
            </View>

            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>{initials}</Text>
              </View>
            )}

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.firstName} {item.lastName}
              </Text>
              {item.role && <Text style={styles.role}>{item.role}</Text>}
              <Text style={styles.business} numberOfLines={1}>
                {item.businessName}
                {item.city ? ` · ${item.city}, ${item.state}` : ""}
              </Text>
            </View>

            <View style={styles.kudosBox}>
              <Text style={styles.kudosCount}>{item.kudosCount}</Text>
              <Text style={styles.kudosLabel}>reviews</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, padding: 12,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    marginBottom: 8,
  },
  rank: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  rankText: { fontWeight: "800", color: colors.textSecondary, fontSize: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border, flexShrink: 0 },
  avatarFallback: { backgroundColor: "#fff7e6", alignItems: "center", justifyContent: "center" },
  avatarFallbackText: { fontWeight: "800", color: colors.accent, fontSize: 14 },
  name: { fontWeight: "700", color: colors.text, fontSize: 15 },
  role: { fontSize: 12, color: colors.textMuted },
  business: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  kudosBox: { alignItems: "center", flexShrink: 0 },
  kudosCount: { fontSize: 22, fontWeight: "800", color: colors.accent },
  kudosLabel: { fontSize: 10, color: colors.textMuted },
});
