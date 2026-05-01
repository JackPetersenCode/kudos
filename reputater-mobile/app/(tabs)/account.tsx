import { useState } from "react";
import { ScrollView, View, Text, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getMe, Me, getProfilePhoto } from "../../lib/auth";
import { apiUrl } from "../../lib/api";
import { getUnreadNotificationCount } from "../../lib/features";
import { getTaterLevel } from "../../lib/taterLevel";
import { openExternalUrl } from "../../lib/url";
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    setLoading(true);
    try {
      const m = await getMe();
      setMe(m);
      try {
        const res = await fetch(apiUrl(`/profile/public/${m.userId}`));
        if (res.ok) setProfile(await res.json());
      } catch { /* ignore */ }
      try {
        const p = await getProfilePhoto();
        setPhotoUrl(p?.originalUrl ?? null);
      } catch { /* ignore */ }
      try {
        const u = await getUnreadNotificationCount();
        setUnreadCount(u.unreadCount);
      } catch { /* ignore */ }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [isReady, isAuthenticated]);

  // Reload on focus so photo/displayName updates from edit-profile show up
  useFocusEffect(useCallback(() => { loadAccount(); }, [loadAccount]));

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
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(me?.displayName || me?.email || "?")[0].toUpperCase()}
                </Text>
              </View>
            )}
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
          onPress={() => router.push("/write-review")}
        >
          <Text style={styles.menuLabel}>✏️  Write a Review</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/my-reviews")}
        >
          <Text style={styles.menuLabel}>📝  My Reviews</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <View style={styles.menuDivider} />
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
          onPress={() => router.push("/feed")}
        >
          <Text style={styles.menuLabel}>📰  Activity Feed</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/notifications")}
        >
          <Text style={styles.menuLabel}>🔔  Notifications</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.menuCard}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/dashboard")}
        >
          <Text style={styles.menuLabel}>🏢  My Businesses</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/dashboard/ads")}
        >
          <Text style={styles.menuLabel}>📢  My Ads</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.menuCard}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/edit-profile")}
        >
          <Text style={styles.menuLabel}>⚙️  Edit Profile</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/notification-preferences")}
        >
          <Text style={styles.menuLabel}>📧  Email Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.btnSecondary, { marginHorizontal: 24, marginTop: 16 }]} onPress={signOut}>
        <Text style={styles.btnSecondaryText}>Sign out</Text>
      </Pressable>

      <View style={styles.legalRow}>
        <Pressable onPress={() => openExternalUrl("https://reputater.com/terms")}>
          <Text style={styles.legalLink}>Terms</Text>
        </Pressable>
        <Text style={styles.legalDot}>·</Text>
        <Pressable onPress={() => openExternalUrl("https://reputater.com/privacy")}>
          <Text style={styles.legalLink}>Privacy</Text>
        </Pressable>
        <Text style={styles.legalDot}>·</Text>
        <Pressable onPress={() => openExternalUrl("https://reputater.com/sms-consent")}>
          <Text style={styles.legalLink}>SMS Consent</Text>
        </Pressable>
        <Text style={styles.legalDot}>·</Text>
        <Pressable onPress={() => openExternalUrl("https://reputater.com/dmca")}>
          <Text style={styles.legalLink}>DMCA</Text>
        </Pressable>
      </View>
      <Text style={styles.versionText}>Reputater · v1.0.0</Text>
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
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 12,
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
  badge: {
    minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11,
    backgroundColor: colors.danger, alignItems: "center", justifyContent: "center",
  },
  badgeText: { color: "white", fontSize: 11, fontWeight: "800" },
  legalRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    flexWrap: "wrap", gap: 8, marginTop: 24, paddingHorizontal: 24,
  },
  legalLink: { color: colors.textMuted, fontSize: 12, fontWeight: "500" },
  legalDot: { color: colors.textMuted, fontSize: 12 },
  versionText: {
    textAlign: "center", color: colors.textMuted, fontSize: 11, marginTop: 8, marginBottom: 24,
  },
});
