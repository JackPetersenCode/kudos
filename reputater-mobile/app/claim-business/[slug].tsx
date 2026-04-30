import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { getBusiness, PublicBusiness } from "../../lib/publicBusiness";
import { initiateClaim, sendEmailCode, sendSmsCode, verifyClaimCode, submitManualClaim } from "../../lib/claim";
import { colors } from "../../lib/theme";

type Step = "loading" | "choose" | "email" | "sms" | "manual" | "verify" | "done" | "error";

export default function ClaimBusinessScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated, isReady } = useAuth();
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [methods, setMethods] = useState<string[]>([]);
  const [bizWebsite, setBizWebsite] = useState<string | null>(null);
  const [bizPhone, setBizPhone] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [code, setCode] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!slug) return;
    (async () => {
      try {
        const biz = await getBusiness(slug);
        setBusiness(biz);
        const data = await initiateClaim(biz.id);
        if (data.status === "approved") {
          setMessage(data.message);
          setStep("done");
          return;
        }
        setMethods(data.availableMethods ?? ["manual"]);
        setBizWebsite(data.businessWebsite ?? null);
        setBizPhone(data.businessPhone ?? null);
        if (data.businessWebsite) {
          try {
            const url = data.businessWebsite.startsWith("http") ? data.businessWebsite : `https://${data.businessWebsite}`;
            let host = new URL(url).hostname;
            if (host.startsWith("www.")) host = host.slice(4);
            setVerificationEmail(`@${host}`);
          } catch { /* ignore */ }
        }
        setStep("choose");
      } catch (err: any) {
        setError(err?.message || "Could not initiate claim.");
        setStep("error");
      }
    })();
  }, [isReady, isAuthenticated, slug]);

  const handleSendEmail = async () => {
    if (!business) return;
    if (!verificationEmail.includes("@") || verificationEmail.startsWith("@")) {
      Alert.alert("Invalid email", "Enter a valid email address at the business domain.");
      return;
    }
    setSending(true); setError("");
    try {
      const data = await sendEmailCode(business.id, verificationEmail);
      setMessage(data.message);
      setStep("verify");
    } catch (err: any) {
      setError(err?.message || "Could not send code.");
    } finally {
      setSending(false);
    }
  };

  const handleSendSms = async () => {
    if (!business) return;
    setSending(true); setError("");
    try {
      const data = await sendSmsCode(business.id);
      setMessage(data.message);
      setStep("verify");
    } catch (err: any) {
      setError(err?.message || "Could not send SMS.");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!business) return;
    if (code.length !== 6) {
      Alert.alert("Invalid code", "Enter the 6-digit code.");
      return;
    }
    setSending(true); setError("");
    try {
      const data = await verifyClaimCode(business.id, code);
      setMessage(data.message);
      setStep("done");
    } catch (err: any) {
      setError(err?.message || "Invalid code.");
    } finally {
      setSending(false);
    }
  };

  const handleManual = async () => {
    if (!business) return;
    if (!manualNote.trim()) {
      Alert.alert("Note required", "Please describe how you're associated with this business.");
      return;
    }
    setSending(true); setError("");
    try {
      await submitManualClaim(business.id, manualNote.trim());
      setMessage("Your claim has been submitted for manual review. You'll be notified when it's resolved.");
      setStep("done");
    } catch (err: any) {
      setError(err?.message || "Could not submit claim.");
    } finally {
      setSending(false);
    }
  };

  if (step === "loading" || !business) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Claim ${business.name}` }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
        {step === "error" && (
          <View style={styles.section}>
            <Text style={styles.h2}>Couldn&apos;t initiate claim</Text>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.btn} onPress={() => router.back()}>
              <Text style={styles.btnText}>Go back</Text>
            </Pressable>
          </View>
        )}

        {step === "done" && (
          <View style={styles.section}>
            <Text style={styles.h2}>You&apos;re in!</Text>
            <Text style={styles.success}>{message}</Text>
            <Pressable style={styles.btn} onPress={() => router.replace(`/dashboard/business/${business.slug}`)}>
              <Text style={styles.btnText}>Go to Dashboard</Text>
            </Pressable>
          </View>
        )}

        {step === "choose" && (
          <View style={styles.section}>
            <Text style={styles.h2}>Verify You Own This Business</Text>
            <Text style={styles.subtitle}>Choose how you&apos;d like to verify your ownership.</Text>

            {methods.includes("email") && (
              <Pressable style={styles.methodCard} onPress={() => setStep("email")}>
                <Text style={styles.methodTitle}>Email Verification</Text>
                <Text style={styles.methodDesc}>
                  We&apos;ll send a code to an email at {bizWebsite ? bizWebsite.replace(/^https?:\/\//, "").replace(/^www\./, "") : "the business domain"}.
                </Text>
              </Pressable>
            )}

            {methods.includes("sms") && (
              <Pressable style={styles.methodCard} onPress={handleSendSms} disabled={sending}>
                <Text style={styles.methodTitle}>Phone Verification</Text>
                <Text style={styles.methodDesc}>
                  We&apos;ll text a one-time code to {bizPhone ?? "the business phone number"}.
                </Text>
                <Text style={[styles.methodDesc, { fontSize: 11, color: colors.textMuted, marginTop: 6 }]}>
                  By tapping this option, you consent to receive 1 SMS message. Message and data rates may apply.
                  Reply STOP to opt out, HELP for help. See our SMS &amp; Privacy policy at reputater.com/sms-consent.
                </Text>
              </Pressable>
            )}

            {methods.includes("manual") && (
              <Pressable style={styles.methodCard} onPress={() => setStep("manual")}>
                <Text style={styles.methodTitle}>Manual Review</Text>
                <Text style={styles.methodDesc}>
                  Submit documentation for an admin to review (1–3 business days).
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {step === "email" && (
          <View style={styles.section}>
            <Text style={styles.h2}>Email Verification</Text>
            <Text style={styles.subtitle}>
              Enter your email at the business domain. We&apos;ll send a 6-digit code.
            </Text>
            <TextInput
              value={verificationEmail}
              onChangeText={setVerificationEmail}
              placeholder="you@yourbusiness.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <View style={styles.row}>
              <Pressable style={[styles.btn, sending && { opacity: 0.6 }]} onPress={handleSendEmail} disabled={sending}>
                <Text style={styles.btnText}>{sending ? "Sending..." : "Send Code"}</Text>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={() => setStep("choose")}>
                <Text style={styles.btnGhostText}>Back</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === "manual" && (
          <View style={styles.section}>
            <Text style={styles.h2}>Manual Review</Text>
            <Text style={styles.subtitle}>
              Tell us how you&apos;re associated with this business. An admin will review your claim.
            </Text>
            <TextInput
              value={manualNote}
              onChangeText={setManualNote}
              multiline
              placeholder="E.g., I'm the owner. You can verify by calling the business at..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { minHeight: 100 }]}
            />
            <View style={styles.row}>
              <Pressable style={[styles.btn, sending && { opacity: 0.6 }]} onPress={handleManual} disabled={sending}>
                <Text style={styles.btnText}>{sending ? "Submitting..." : "Submit for Review"}</Text>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={() => setStep("choose")}>
                <Text style={styles.btnGhostText}>Back</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === "verify" && (
          <View style={styles.section}>
            <Text style={styles.h2}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>{message}</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.codeInput]}
            />
            <View style={styles.row}>
              <Pressable
                style={[styles.btn, (sending || code.length !== 6) && { opacity: 0.6 }]}
                onPress={handleVerify}
                disabled={sending || code.length !== 6}
              >
                <Text style={styles.btnText}>{sending ? "Verifying..." : "Verify"}</Text>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={() => setStep("choose")}>
                <Text style={styles.btnGhostText}>Back</Text>
              </Pressable>
            </View>

            <Pressable style={{ marginTop: 16, alignItems: "center" }} onPress={() => setStep("choose")}>
              <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 13 }}>
                Didn&apos;t get the code? Try a different method
              </Text>
            </Pressable>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  section: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 12,
  },
  h2: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  methodCard: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  methodTitle: { fontWeight: "700", color: colors.text, fontSize: 14 },
  methodDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: colors.text, marginBottom: 12,
  },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: "center", maxWidth: 220, alignSelf: "center" },
  row: { flexDirection: "row", gap: 8 },
  btn: { backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 14 },
  btnGhost: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, alignItems: "center" },
  btnGhostText: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
  success: { color: colors.success, fontSize: 14, marginBottom: 16, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 13, marginTop: 8 },
});
