import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors } from "../lib/theme";
import { SearchResult } from "../lib/publicBusiness";

const PLACEHOLDER = "https://pub-e3a9c8c4ae654841ba1d956cb83dc898.r2.dev/placeholders/default.jpg";

export default function BusinessCard({ business }: { business: SearchResult }) {
  const photoUrl = business.primaryPhotoUrl?.trim() || PLACEHOLDER;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      onPress={() => router.push(`/business/${business.slug}`)}
    >
      <Image source={{ uri: photoUrl }} style={styles.photo} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{business.name}</Text>
          {business.isVerified && <Text style={{ color: colors.accent }}>✓</Text>}
        </View>

        <View style={styles.tagRow}>
          <Text style={[styles.tag, business.isOpenNow ? styles.tagOpen : styles.tagClosed]}>
            {business.isOpenNow ? "Open" : "Closed"}
          </Text>
          {business.reviewCount > 0 && (
            <Text style={[styles.tag, styles.tagAccent]}>
              {business.reviewCount} review{business.reviewCount === 1 ? "" : "s"}
            </Text>
          )}
        </View>

        {business.categories.length > 0 && (
          <Text style={styles.categories} numberOfLines={1}>
            {business.categories.slice(0, 3).join(" · ")}
          </Text>
        )}

        <Text style={styles.location} numberOfLines={1}>
          📍 {[business.city, business.state].filter(Boolean).join(", ") || "Location not listed"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  photo: { width: 110, height: 110, backgroundColor: colors.border },
  body: { flex: 1, padding: 12, justifyContent: "space-between" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontWeight: "700", flex: 1, color: colors.text },
  tagRow: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  tag: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontWeight: "600", overflow: "hidden" },
  tagOpen: { backgroundColor: "#ecfdf5", color: colors.success },
  tagClosed: { backgroundColor: "#f1f5f9", color: colors.textMuted },
  tagAccent: { backgroundColor: "#fff7e6", color: colors.accent },
  categories: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  location: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
});
