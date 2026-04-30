import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { resetPassword } from "../lib/auth";
import { colors } from "../lib/theme";

export default function ResetPasswordScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(tokenParam ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!token.trim()) {
      setError("Paste the reset code from your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token.trim(), password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "Reset Password" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Set a new password</Text>

        {done ? (
          <>
            <Text style={styles.success}>Your password has been updated.</Text>
            <Pressable style={styles.btn} onPress={() => router.replace("/login")}>
              <Text style={styles.btnText}>Sign in</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              {tokenParam
                ? "Choose a new password to finish resetting your account."
                : "Open the reset link from your email, or paste the token below."}
            </Text>

            {!tokenParam && (
              <>
                <Text style={styles.label}>Reset token</Text>
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

            <Text style={styles.label}>New password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="new-password"
              style={styles.input}
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat your new password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="new-password"
              style={styles.input}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.btnText}>{loading ? "Resetting..." : "Reset password"}</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: "900", color: colors.text, marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24, lineHeight: 20, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 14, marginBottom: 6 },
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
  success: { color: colors.success, marginTop: 12, fontSize: 14, lineHeight: 20, textAlign: "center" },
});
