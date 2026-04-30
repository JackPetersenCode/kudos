import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Image } from "react-native";
import { Stack, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../../contexts/AuthContext";
import { getOwnedBusinesses, OwnedBusiness } from "../../../lib/businessOwner";
import { createAd, uploadAdImage } from "../../../lib/ads";
import { colors } from "../../../lib/theme";

export default function NewAdScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [businesses, setBusinesses] = useState<OwnedBusiness[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    getOwnedBusinesses()
      .then((bs) => {
        setBusinesses(bs);
        if (bs.length === 1) setBusinessId(bs[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isReady, isAuthenticated]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const fileName = asset.uri.split("/").pop() || `ad-${Date.now()}.jpg`;
      const url = await uploadAdImage({ uri: asset.uri, name: fileName, type: asset.mimeType || "image/jpeg" });
      setImageUrl(url);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Try again");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (status: "draft" | "pending_review") => {
    if (!businessId) {
      Alert.alert("Pick a business", "Select which business this ad is for.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Title required", "Give your ad a title.");
      return;
    }
    if (!destinationUrl.trim()) {
      Alert.alert("Destination URL required", "Where should clicks go?");
      return;
    }
    setSaving(true);
    try {
      const ad = await createAd({
        businessId,
        title: title.trim(),
        headline: headline.trim() || null,
        description: description.trim() || null,
        imageUrl: imageUrl || null,
        destinationUrl: destinationUrl.trim(),
        status,
      });
      router.replace(`/dashboard/ads/${ad.id}`);
    } catch (e: any) {
      Alert.alert("Couldn't create ad", e?.message || "Try again");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (businesses.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
          You need to own or manage a business before creating ads.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Create Ad" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business</Text>
          <View style={styles.chipRow}>
            {businesses.map((b) => {
              const active = businessId === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setBusinessId(b.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{b.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ad Content</Text>

          <Text style={styles.label}>Title *</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Internal name for the ad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.label}>Headline</Text>
          <TextInput value={headline} onChangeText={setHeadline} style={styles.input} placeholder="Catchy line shown to viewers" placeholderTextColor={colors.textMuted} maxLength={80} />

          <Text style={styles.label}>Description</Text>
          <TextInput value={description} onChangeText={setDescription} style={[styles.input, { minHeight: 80 }]} multiline placeholder="What's special about your business?" placeholderTextColor={colors.textMuted} maxLength={200} />

          <Text style={styles.label}>Destination URL *</Text>
          <TextInput value={destinationUrl} onChangeText={setDestinationUrl} style={styles.input} keyboardType="url" autoCapitalize="none" placeholder="https://..." placeholderTextColor={colors.textMuted} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Image</Text>
          <Text style={styles.helper}>16:9 ratio recommended. JPEG or PNG.</Text>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
          ) : (
            <View style={[styles.imagePreview, { alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ color: colors.textMuted }}>No image yet</Text>
            </View>
          )}
          <Pressable style={[styles.btn, uploading && { opacity: 0.6 }]} onPress={pickImage} disabled={uploading}>
            <Text style={styles.btnText}>{uploading ? "Uploading..." : imageUrl ? "Replace Image" : "Pick Image"}</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.btnGhost, saving && { opacity: 0.6 }]}
            onPress={() => onSubmit("draft")}
            disabled={saving}
          >
            <Text style={styles.btnGhostText}>Save Draft</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, { flex: 1 }, saving && { opacity: 0.6 }]}
            onPress={() => onSubmit("pending_review")}
            disabled={saving}
          >
            <Text style={styles.btnText}>{saving ? "Submitting..." : "Submit for Review"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg, padding: 24 },
  section: {
    backgroundColor: colors.surface, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "500" },
  chipTextActive: { color: "white", fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  helper: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  imagePreview: {
    width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.bg,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  btn: {
    backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 999, alignItems: "center", paddingHorizontal: 16,
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 14 },
  btnGhost: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  btnGhostText: { color: colors.text, fontWeight: "700", fontSize: 14 },
  actions: { flexDirection: "row", gap: 8 },
});
