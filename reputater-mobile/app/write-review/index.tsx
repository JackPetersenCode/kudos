import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Image, ScrollView } from "react-native";
import { Stack, router } from "expo-router";
import { autocomplete, AutocompleteBusiness } from "../../lib/publicBusiness";
import { ALL_LEVELS } from "../../lib/taterLevel";
import { useAuth } from "../../contexts/AuthContext";
import { colors } from "../../lib/theme";

const RANGES = ["0–2 reviews", "3–9 reviews", "10–24 reviews", "25–49 reviews", "50–99 reviews", "100+ reviews"];

export default function WriteReviewIndex() {
  const { isAuthenticated, isReady } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AutocompleteBusiness[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const data = await autocomplete(query.trim());
        setResults(data.businesses);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <>
      <Stack.Screen options={{ title: "Write a Review" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.intro}>
          <Text style={styles.title}>Write a Review</Text>
          <Text style={styles.subtitle}>
            Search for a business to share your experience. Only positive reviews are accepted —
            tell the world what a business did right.
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for a business..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="words"
          />
          {searching && <Text style={styles.searching}>Searching...</Text>}
        </View>

        {results.length > 0 && (
          <View style={styles.resultsCard}>
            <FlatList
              data={results}
              scrollEnabled={false}
              keyExtractor={(item) => item.slug}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.resultRow}
                  onPress={() => router.push(`/write-review/${item.slug}`)}
                >
                  <Image
                    source={{ uri: item.photoUrl || "https://pub-e3a9c8c4ae654841ba1d956cb83dc898.r2.dev/placeholders/default.jpg" }}
                    style={styles.resultThumb}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.resultLocation} numberOfLines={1}>
                      {[item.city, item.state].filter(Boolean).join(", ") || "Location not listed"}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {item.reviewCount} review{item.reviewCount === 1 ? "" : "s"}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          {[
            { step: "1", t: "Find the business", d: "Type the business name above to search." },
            { step: "2", t: "Share your experience", d: "Write about what they did well. Recognize great staff." },
            { step: "3", t: "Post your review", d: "Your review helps great businesses get discovered." },
          ].map((s) => (
            <View key={s.step} style={styles.stepRow}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNum}>{s.step}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.t}</Text>
                <Text style={styles.stepDesc}>{s.d}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Become a Tater Rater</Text>
          <Text style={styles.taterIntro}>
            Every review you write earns you progress toward the next level. Your badge appears on every review you post.
          </Text>
          <View style={styles.taterGrid}>
            {ALL_LEVELS.map((level, idx) => (
              <View key={level.name} style={styles.taterCard}>
                <Image source={{ uri: level.image }} style={styles.taterImg} />
                <Text style={styles.taterName}>{level.name}</Text>
                <Text style={styles.taterRange}>{RANGES[idx]}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { padding: 24, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: "900", color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  searchWrap: { paddingHorizontal: 24, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: 14, fontSize: 15, color: colors.text,
  },
  searching: { fontSize: 12, color: colors.textMuted, marginTop: 6, marginLeft: 4 },
  resultsCard: {
    marginHorizontal: 24, marginTop: 8, marginBottom: 16,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: colors.border },
  resultRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  resultThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.border },
  resultName: { fontWeight: "700", color: colors.text, fontSize: 14 },
  resultLocation: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  resultMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  section: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 12,
    padding: 20, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 },
  stepRow: { flexDirection: "row", gap: 14, marginBottom: 16 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  stepNum: { color: "white", fontWeight: "800", fontSize: 14 },
  stepTitle: { fontWeight: "700", color: colors.text, fontSize: 14, marginBottom: 2 },
  stepDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  taterIntro: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 16, textAlign: "center" },
  taterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  taterCard: {
    width: "31%", borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: 12, alignItems: "center", backgroundColor: colors.bg,
  },
  taterImg: { width: 60, height: 60, marginBottom: 6 },
  taterName: { fontWeight: "700", fontSize: 12, color: colors.text },
  taterRange: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: "center" },
});
