import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { StaffMember } from "../lib/staff";
import { colors } from "../lib/theme";

const TAG_ICONS: Record<string, string> = {
  friendly: "😊",
  knowledgeable: "🧠",
  efficient: "⚡",
  professional: "👔",
  "went-above-and-beyond": "🌟",
};

export default function StaffSection({ staff }: { staff: StaffMember[] }) {
  if (staff.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Meet the Team</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {staff.map((m) => {
          const initials = `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();
          return (
            <View key={m.id} style={styles.card}>
              {m.photoUrl ? (
                <Image source={{ uri: m.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackText}>{initials}</Text>
                </View>
              )}
              <Text style={styles.name} numberOfLines={1}>
                {m.firstName} {m.lastName}
              </Text>
              {m.role && <Text style={styles.role} numberOfLines={1}>{m.role}</Text>}
              <Text style={styles.kudos}>{m.kudosCount} review{m.kudosCount === 1 ? "" : "s"}</Text>
              {m.topTags.length > 0 && (
                <View style={styles.tagsRow}>
                  {m.topTags.slice(0, 3).map((t) => (
                    <Text key={t.tagName} style={styles.tag}>
                      {TAG_ICONS[t.tagName] ?? ""}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { padding: 16, backgroundColor: colors.surface, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  card: {
    width: 110, padding: 10, alignItems: "center",
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 6, backgroundColor: colors.border },
  avatarFallback: { backgroundColor: "#fff7e6", alignItems: "center", justifyContent: "center" },
  avatarFallbackText: { fontWeight: "800", color: colors.accent, fontSize: 18 },
  name: { fontWeight: "700", fontSize: 13, color: colors.text, textAlign: "center" },
  role: { fontSize: 11, color: colors.textSecondary, textAlign: "center", marginTop: 2 },
  kudos: { fontSize: 11, color: colors.accent, fontWeight: "700", marginTop: 4 },
  tagsRow: { flexDirection: "row", gap: 4, marginTop: 6 },
  tag: { fontSize: 14 },
});
