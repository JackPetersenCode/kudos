import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, Image } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../../../contexts/AuthContext";
import { getOwnedBusiness, BusinessDetail, uploadBusinessPhoto, createStaffMember } from "../../../../lib/businessOwner";
import { colors } from "../../../../lib/theme";

export default function OnboardingWizard() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated, isReady } = useAuth();
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  // Step 1
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);

  // Step 2
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [role, setRole] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!slug) return;
    getOwnedBusiness(slug)
      .then(setBusiness)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isReady, isAuthenticated, slug]);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.8,
    });
    if (result.canceled) return;
    setPhotos(result.assets);
  };

  const uploadAll = async () => {
    if (!business || photos.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < photos.length; i++) {
        const a = photos[i];
        const fileName = a.uri.split("/").pop() || `photo-${Date.now()}-${i}.jpg`;
        await uploadBusinessPhoto(business.id, { uri: a.uri, name: fileName, type: a.mimeType || "image/jpeg", size: a.fileSize }, i === 0);
      }
      setPhotos([]);
      setStep(2);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Try again");
    } finally {
      setUploading(false);
    }
  };

  const addStaff = async () => {
    if (!business) return;
    if (!first.trim() || !last.trim()) {
      Alert.alert("Missing info", "First and last name are required.");
      return;
    }
    setSavingStaff(true);
    try {
      await createStaffMember(business.id, {
        firstName: first.trim(),
        lastName: last.trim(),
        role: role.trim() || null,
      });
      setAdded([...added, `${first} ${last}`]);
      setFirst(""); setLast(""); setRole("");
    } catch (e: any) {
      Alert.alert("Couldn't add", e?.message || "Try again");
    } finally {
      setSavingStaff(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Business not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Get Started" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.h1}>Welcome, {business.name}!</Text>
        <Text style={styles.subtitle}>Let&apos;s set up your profile in 3 quick steps.</Text>

        <View style={styles.stepperRow}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={[styles.stepDot, n === step && styles.stepDotActive, n < step && styles.stepDotDone]}>
              <Text style={[styles.stepDotText, (n === step || n < step) && styles.stepDotTextActive]}>{n}</Text>
            </View>
          ))}
        </View>

        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.h2}>1. Add photos</Text>
            <Text style={styles.helper}>
              Pick at least 3 photos: exterior, interior, and product or service. The first photo becomes the primary.
            </Text>
            <Pressable style={styles.btn} onPress={pickPhotos}>
              <Text style={styles.btnText}>{photos.length > 0 ? `Selected (${photos.length})` : "Pick photos"}</Text>
            </Pressable>
            {photos.length > 0 && (
              <View style={styles.photoGrid}>
                {photos.map((p, i) => (
                  <Image key={i} source={{ uri: p.uri }} style={styles.photoThumb} />
                ))}
              </View>
            )}
            <View style={styles.navRow}>
              <Pressable style={styles.btnGhost} onPress={() => setStep(2)}>
                <Text style={styles.btnGhostText}>Skip</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, (uploading || photos.length === 0) && { opacity: 0.6 }]}
                onPress={uploadAll}
                disabled={uploading || photos.length === 0}
              >
                <Text style={styles.btnText}>{uploading ? "Uploading..." : "Upload & Continue"}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.h2}>2. Add staff</Text>
            <Text style={styles.helper}>
              Add team members so customers can recognize them in reviews. You can always add more later.
            </Text>
            {added.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                {added.map((n) => (
                  <Text key={n} style={styles.addedItem}>✓ {n}</Text>
                ))}
              </View>
            )}
            <Text style={styles.label}>First Name</Text>
            <TextInput style={styles.input} value={first} onChangeText={setFirst} />
            <Text style={styles.label}>Last Name</Text>
            <TextInput style={styles.input} value={last} onChangeText={setLast} />
            <Text style={styles.label}>Role (optional)</Text>
            <TextInput style={styles.input} value={role} onChangeText={setRole} placeholder="e.g. Server, Stylist" placeholderTextColor={colors.textMuted} />
            <Pressable style={[styles.btn, savingStaff && { opacity: 0.6 }]} onPress={addStaff} disabled={savingStaff}>
              <Text style={styles.btnText}>{savingStaff ? "Adding..." : "+ Add Staff Member"}</Text>
            </Pressable>
            <View style={styles.navRow}>
              <Pressable style={styles.btnGhost} onPress={() => setStep(1)}>
                <Text style={styles.btnGhostText}>Back</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={() => setStep(3)}>
                <Text style={styles.btnText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.h2}>3. You&apos;re all set!</Text>
            <Text style={styles.helper}>
              Want to fine-tune your hours, categories, and features? You can do that now or later from the dashboard.
            </Text>
            <Pressable style={styles.btn} onPress={() => router.replace(`/dashboard/business/${business.slug}/edit`)}>
              <Text style={styles.btnText}>Edit Details</Text>
            </Pressable>
            <View style={styles.navRow}>
              <Pressable style={styles.btnGhost} onPress={() => setStep(2)}>
                <Text style={styles.btnGhostText}>Back</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={() => router.replace(`/dashboard/business/${business.slug}`)}>
                <Text style={styles.btnText}>Go to Dashboard</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  h1: { fontSize: 24, fontWeight: "900", color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
  stepperRow: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 16 },
  stepDot: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
  },
  stepDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepDotDone: { backgroundColor: "#fef9eb", borderColor: colors.accent },
  stepDotText: { fontWeight: "800", color: colors.textMuted },
  stepDotTextActive: { color: "white" },
  section: {
    backgroundColor: colors.surface, padding: 20, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  h2: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 8 },
  helper: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 16 },
  btn: { backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 14 },
  btnGhost: { paddingVertical: 12, paddingHorizontal: 16 },
  btnGhostText: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12, marginBottom: 4 },
  photoThumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.border },
  label: { fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text, marginBottom: 4,
  },
  addedItem: { color: colors.success, fontSize: 13, fontWeight: "600", marginBottom: 4 },
});
