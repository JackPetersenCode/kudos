import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { verifyEmail } from "../lib/auth";
import { colors } from "../lib/theme";

export default function VerifyEmailScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(tokenParam ?? "");
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (t: string) => {
    setError("");
    setVerifying(true);
    try {
      await verifyEmail(t);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify email.");
    } finally {
      setVerifying(false);
    }
  };

  // Auto-verify if token came from a deep link
  useEffect(() => {
    if (tokenParam) handleVerify(tokenParam);
  }, [tokenParam]);

  return (
    <>
      <Stack.Screen options={{ title: "Verify Email" }} />
      <View style={styles.container}>
        {verifying ? (
          <>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.subtitle}>Verifying your email…</Text>
          </>
        ) : done ? (
          <>
            <Text style={styles.title}>Email verified!</Text>
            <Text style={styles.subtitle}>You&apos;re all set. You can now claim businesses and use all account features.</Text>
            <Pressable style={styles.btn} onPress={() => router.replace("/(tabs)/account")}>
              <Text style={styles.btnText}>Continue</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              {tokenParam
                ? "Tap the button below to complete verification."
                : "Open the verification link from your email, or paste the token below."}
            </Text>

            {!tokenParam && (
              <>
                <Text style={styles.label}>Verification token</Text>
                <TextInput
                  value={token}
                  onChangeText={setToken}
                  placeholder="Paste the token from your email"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  style={styles.input}
                />
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.btn, !token.trim() && { opacity: 0.6 }]}
              onPress={() => handleVerify(token.trim())}
              disabled={!token.trim()}
            >
              <Text style={styles.btnText}>Verify</Text>
            </Pressable>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.bg, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "900", color: colors.text, marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24, lineHeight: 20, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 4, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, fontSize: 15, color: colors.text,
  },
  btn: {
    backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 999,
    alignItems: "center", marginTop: 24,
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 15 },
  error: { color: colors.danger, marginTop: 12, fontSize: 13 },
});
