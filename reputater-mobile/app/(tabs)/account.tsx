import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { getMe, Me } from "../../lib/auth";
import { colors } from "../../lib/theme";

export default function AccountScreen() {
  const { isAuthenticated, isReady, signOut } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    setLoading(true);
    getMe()
      .then(setMe)
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

  return (
    <View style={styles.signedIn}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(me?.displayName || me?.email || "?")[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{me?.displayName || me?.email?.split("@")[0]}</Text>
          <Text style={styles.email}>{me?.email}</Text>

          <Pressable style={styles.btnSecondary} onPress={signOut}>
            <Text style={styles.btnSecondaryText}>Sign out</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  signedOut: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  signedIn: { flex: 1, alignItems: "center", padding: 32 },
  title: { fontSize: 24, fontWeight: "900", color: colors.text, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "white" },
  name: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 4 },
  email: { fontSize: 14, color: colors.textSecondary, marginBottom: 32 },
  btnPrimary: {
    backgroundColor: colors.accent,
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 999, marginBottom: 12,
    minWidth: 220, alignItems: "center",
  },
  btnPrimaryText: { color: "white", fontWeight: "700", fontSize: 15 },
  btnSecondary: {
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    minWidth: 220, alignItems: "center",
  },
  btnSecondaryText: { color: colors.text, fontWeight: "600", fontSize: 15 },
});
