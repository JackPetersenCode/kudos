import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, Image, ScrollView } from "react-native";
import { Stack, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../contexts/AuthContext";
import { getMe, updateDisplayName, getProfilePhoto, uploadProfilePhoto } from "../lib/auth";
import { colors } from "../lib/theme";

export default function EditProfileScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    Promise.all([
      getMe().then((me) => setDisplayName(me.displayName || "")).catch(() => {}),
      getProfilePhoto().then((p) => setPhotoUrl(p?.originalUrl ?? null)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [isReady, isAuthenticated]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const fileName = asset.uri.split("/").pop() || `avatar-${Date.now()}.jpg`;
      await uploadProfilePhoto({
        uri: asset.uri,
        name: fileName,
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      });
      const refreshed = await getProfilePhoto();
      setPhotoUrl(refreshed?.originalUrl ?? null);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Try again");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      Alert.alert("Display name", "Display name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      await updateDisplayName(trimmed);
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
      <Stack.Screen options={{ title: "Edit Profile" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
        <View style={styles.photoSection}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>
                {(displayName[0] || "?").toUpperCase()}
              </Text>
            </View>
          )}
          <Pressable style={[styles.photoBtn, uploading && { opacity: 0.6 }]} onPress={pickPhoto} disabled={uploading}>
            <Text style={styles.photoBtnText}>
              {uploading ? "Uploading..." : photoUrl ? "Change Photo" : "Add Photo"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          maxLength={50}
          style={styles.input}
          placeholder="How others see you"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>This is shown on your reviews and profile.</Text>

        <Pressable style={[styles.btn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
          <Text style={styles.btnText}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  container: { padding: 24 },
  photoSection: { alignItems: "center", marginBottom: 24 },
  photo: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.border },
  photoPlaceholder: { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { fontSize: 48, fontWeight: "800", color: "white" },
  photoBtn: {
    marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  photoBtnText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  btn: {
    backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 999,
    alignItems: "center", marginTop: 24,
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
