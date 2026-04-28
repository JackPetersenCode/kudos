import { useEffect, useState } from "react";
import {
  ScrollView, View, Text, TextInput, Pressable, Image,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  getBusiness, createBusinessReview, uploadReviewPhoto, PublicBusiness,
} from "../../lib/publicBusiness";
import { useAuth } from "../../contexts/AuthContext";
import { colors } from "../../lib/theme";

const TAGS = [
  { key: "service", label: "Service", icon: "🤝" },
  { key: "quality", label: "Quality", icon: "⭐" },
  { key: "cleanliness", label: "Cleanliness", icon: "🧼" },
  { key: "value", label: "Value", icon: "💰" },
  { key: "experience", label: "Experience", icon: "✨" },
];

type StagedPhoto = { uri: string; name: string; type: string };

export default function WriteReviewScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated, isReady } = useAuth();
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<StagedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!slug) return;
    getBusiness(slug).then(setBusiness).catch(() => {});
  }, [slug, isReady, isAuthenticated]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  async function pickPhoto() {
    if (photos.length >= 5) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 5 - photos.length,
      allowsMultipleSelection: true,
    });
    if (result.canceled) return;
    const newPhotos = result.assets.map((a) => ({
      uri: a.uri,
      name: a.fileName || `photo-${Date.now()}.jpg`,
      type: a.mimeType || "image/jpeg",
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
  }

  async function handleSubmit() {
    if (!business) return;
    if (selectedTags.length === 0) {
      Alert.alert("Select at least one category", "What did this business do well?");
      return;
    }
    setSubmitting(true);
    try {
      const uploaded = [];
      for (const photo of photos) {
        const result = await uploadReviewPhoto(photo);
        uploaded.push({ ...result, contentType: photo.type });
      }
      await createBusinessReview(business.id, {
        rating: Math.max(1, selectedTags.length),
        title: title.trim() || null,
        body: body.trim() || null,
        positiveTags: selectedTags,
        photos: uploaded,
      });
      Alert.alert("Posted!", "Your review is live.", [
        { text: "OK", onPress: () => router.replace(`/business/${slug}`) },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not post review.";
      const reason = (err as any)?.status === 400 && msg.includes("negative")
        ? "Mama always says, if you don't have anything nice to say, don't say anything at all!"
        : msg;
      Alert.alert("Error", reason);
    } finally {
      setSubmitting(false);
    }
  }

  if (!business) {
    return (
      <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Write a review" }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.bizHeader}>
            <Text style={styles.bizName}>{business.name}</Text>
            <Text style={styles.bizLoc}>{[business.city, business.state].filter(Boolean).join(", ")}</Text>
          </View>

          <Text style={styles.section}>What did this business do well?</Text>
          <View style={styles.tagGrid}>
            {TAGS.map((t) => {
              const active = selectedTags.includes(t.key);
              return (
                <Pressable
                  key={t.key}
                  onPress={() => toggleTag(t.key)}
                  style={[styles.tag, active && styles.tagActive]}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>
                    {t.icon} {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>Title (optional)</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What stood out?"
            style={styles.input}
            maxLength={120}
          />

          <Text style={styles.section}>Tell us more (optional)</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Share your experience..."
            style={[styles.input, { minHeight: 120, textAlignVertical: "top" }]}
            multiline
            maxLength={2000}
          />

          <Text style={styles.section}>Photos (up to 5)</Text>
          <View style={styles.photoRow}>
            {photos.map((p, i) => (
              <View key={i} style={styles.photoWrap}>
                <Image source={{ uri: p.uri }} style={styles.photo} />
                <Pressable
                  onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  style={styles.photoRemove}
                >
                  <Text style={styles.photoRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}
            {photos.length < 5 && (
              <Pressable onPress={pickPhoto} style={styles.photoAdd}>
                <Text style={{ fontSize: 32, color: colors.textMuted }}>+</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting || selectedTags.length === 0}
            style={[styles.submitBtn, (submitting || selectedTags.length === 0) && { opacity: 0.5 }]}
          >
            <Text style={styles.submitText}>{submitting ? "Posting..." : "Post Review"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  bizHeader: { marginBottom: 20 },
  bizName: { fontSize: 22, fontWeight: "800", color: colors.text },
  bizLoc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  section: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 18, marginBottom: 10 },
  tagGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  tagActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  tagTextActive: { color: "white" },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, fontSize: 15, color: colors.text,
  },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoWrap: { position: "relative" },
  photo: { width: 80, height: 80, borderRadius: 8 },
  photoRemove: {
    position: "absolute", top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  photoRemoveText: { color: "white", fontSize: 14, fontWeight: "700", lineHeight: 14 },
  photoAdd: {
    width: 80, height: 80, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", backgroundColor: colors.surface,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 16, borderRadius: 999,
    marginTop: 28, alignItems: "center",
  },
  submitText: { color: "white", fontWeight: "700", fontSize: 16 },
});
