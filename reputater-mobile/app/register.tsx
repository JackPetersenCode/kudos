import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { router, Link } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../lib/theme";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignUp() {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      router.replace("/(tabs)/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Create account</Text>

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

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          autoComplete="new-password"
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.terms}>
          By creating an account you agree to the Terms of Service and Privacy Policy at reputater.com.
        </Text>

        <Pressable style={styles.btn} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Creating..." : "Create account"}</Text>
        </Pressable>

        <View style={{ marginTop: 20, alignItems: "center" }}>
          <Text style={{ color: colors.textSecondary }}>
            Have an account?{" "}
            <Link href="/login" style={{ color: colors.accent, fontWeight: "700" }}>
              Sign in
            </Link>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 28, fontWeight: "900", color: colors.text, marginBottom: 24, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, fontSize: 15,
  },
  btn: {
    backgroundColor: colors.accent,
    paddingVertical: 14, borderRadius: 999, marginTop: 16, alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 15 },
  error: { color: colors.danger, marginTop: 12, fontSize: 13 },
  terms: { fontSize: 12, color: colors.textMuted, marginTop: 16, lineHeight: 18 },
});
