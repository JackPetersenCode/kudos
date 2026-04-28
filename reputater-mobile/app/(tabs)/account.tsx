import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { getMe, Me } from "../../lib/auth";
import { apiUrl } from "../../lib/api";
import { getTaterLevel } from "../../lib/taterLevel";
import { colors } from "../../lib/theme";

type PublicProfile = {
  userId: string;
  displayName: string;
  joinedAtUtc: string;
  reviewCount: number;
  checkinCount: number;
};

export default function AccountScreen() {
  const { isAuthenticated, isReady, signOut } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    setLoading(true);
    getMe()
      .then(async (m) => {
        setMe(m);
        try {
          const res = await fetch(apiUrl(`/profile/public/${m.userId}`));
          if (res.ok) setProfile(await res.json());
        } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isReady, isAuthenticated]);

  if (!isReady) return <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />;

  if (!isAuthenticated) {
    return (
      <View style={styles.signedOut}>
        <Text style={styles.title}>Welcome to Reputater</Text>
        <Text style={styles.subtitle}>Sign in to leave reviews and earn Tater Rater levels.</Text>
        <Pressable style={styles.btnPrimary} onPress={() => router.push("/login")}>
          <Text style={styles.btnPrimaryText}>Sign In</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => router.push("/register")}>
          <Text style={styles.btnSecondaryText}>Create Account</Text>
        </Pressable>
      </View>
    );
  }

  const reviewCount = profile?.reviewCount ?? 0;
  const level = getTaterLevel(reviewCount);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.profileCard}>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(me?.displayName || me?.email || "?")[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>
              {me?.displayName || me?.email?.split("@")[0]}
            </Text>
            <Text style={styles.email}>{me?.email}</Text>

            <View style={styles.levelBadge}>
              <Image source={{ uri: level.image }} style={styles.levelImage} />
              <Text style={styles.levelName}>{level.name}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{reviewCount}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{profile?.checkinCount ?? 0}</Text>
                <Text style={styles.statLabel}>Check-ins</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.menuCard}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/favorites")}
        >
          <Text style={styles.menuLabel}>♥  Saved Businesses</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/notifications")}
        >
          <Text style={styles.menuLabel}>🔔  Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.btnSecondary, { marginHorizontal: 24, marginTop: 16 }]} onPress={signOut}>
        <Text style={styles.btnSecondaryText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  signedOut: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "900", color: colors.text, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 32 },
  profileCard: {
    backgroundColor: colors.surface, padding: 24, alignItems: "center",
    margin: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "white" },
  name: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 2 },
  email: { fontSize: 13, color: colors.textSecondary, marginBottom: 14 },
  levelBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: "#fef9eb", marginBottom: 16,
  },
  levelImage: { width: 28, height: 28 },
  levelName: { fontWeight: "700", color: colors.accent, fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 32, marginTop: 8 },
  statBox: { alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  menuCard: {
    backgroundColor: colors.surface, marginHorizontal: 16,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16,
  },
  menuLabel: { fontSize: 15, color: colors.text, fontWeight: "500" },
  menuArrow: { fontSize: 20, color: colors.textMuted },
  menuDivider: { height: 1, backgroundColor: colors.border },
  btnPrimary: {
    backgroundColor: colors.accent, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 999, marginBottom: 12, minWidth: 220, alignItems: "center",
  },
  btnPrimaryText: { color: "white", fontWeight: "700", fontSize: 15 },
  btnSecondary: {
    paddingVertical: 14, paddingHorizontal: 32, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, alignItems: "center",
    backgroundColor: colors.surface,
  },
  btnSecondaryText: { color: colors.text, fontWeight: "600", fontSize: 15 },
});
