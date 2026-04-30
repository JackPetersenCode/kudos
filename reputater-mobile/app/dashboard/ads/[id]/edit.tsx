import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Image } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../../../contexts/AuthContext";
import { getMyAd, updateAd, uploadAdImage } from "../../../../lib/ads";
import { colors } from "../../../../lib/theme";

export default function EditAdScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, isReady } = useAuth();
  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!id) return;
    getMyAd(id)
      .then((ad) => {
        setTitle(ad.title);
        setHeadline(ad.headline ?? "");
        setDescription(ad.description ?? "");
        setDestinationUrl(ad.destinationUrl);
        setImageUrl(ad.imageUrl ?? "");
        setStatus(ad.status);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isReady, isAuthenticated, id]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [16, 9],
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

  const onSave = async () => {
    if (!id) return;
    if (!title.trim() || !destinationUrl.trim()) {
      Alert.alert("Missing info", "Title and destination URL are required.");
      return;
    }
    setSaving(true);
    try {
      await updateAd(id, {
        title: title.trim(),
        headline: headline.trim() || null,
        description: description.trim() || null,
        imageUrl: imageUrl || null,
        destinationUrl: destinationUrl.trim(),
        status,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message || "Try again");
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

  return (
    <>
      <Stack.Screen options={{ title: "Edit Ad" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} />

          <Text style={styles.label}>Headline</Text>
          <TextInput value={headline} onChangeText={setHeadline} style={styles.input} maxLength={80} />

          <Text style={styles.label}>Description</Text>
          <TextInput value={description} onChangeText={setDescription} style={[styles.input, { minHeight: 80 }]} multiline maxLength={200} />

          <Text style={styles.label}>Destination URL *</Text>
          <TextInput value={destinationUrl} onChangeText={setDestinationUrl} style={styles.input} keyboardType="url" autoCapitalize="none" />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Image</Text>
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

        <Pressable style={[styles.btn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
          <Text style={styles.btnText}>{saving ? "Saving..." : "Save Changes"}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  section: {
    backgroundColor: colors.surface, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  label: { fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  imagePreview: {
    width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.bg,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  btn: { backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 14 },
});
