import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Stack, router } from "expo-router";
import { forgotPassword } from "../lib/auth";
import { colors } from "../lib/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "Forgot Password" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Reset your password</Text>

        {sent ? (
          <>
            <Text style={styles.subtitle}>
              If an account exists for that email, we&apos;ve sent a link to reset your password.
              Open the link from your email to continue.
            </Text>
            <Pressable style={styles.btn} onPress={() => router.replace("/login")}>
              <Text style={styles.btnText}>Back to sign in</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Enter the email associated with your account and we&apos;ll send you a reset link.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={styles.input}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.btn} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.btnText}>{loading ? "Sending..." : "Send reset link"}</Text>
            </Pressable>

            <Pressable style={{ marginTop: 16, alignItems: "center" }} onPress={() => router.push("/reset-password")}>
              <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 13 }}>
                I already have a reset token
              </Text>
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
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 4, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, fontSize: 15,
  },
  btn: {
    backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 999, marginTop: 24, alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 15 },
  error: { color: colors.danger, marginTop: 12, fontSize: 13 },
});
