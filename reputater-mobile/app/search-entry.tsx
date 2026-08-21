import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiUrl } from "../lib/api";
import { getRecentSearches, getRecentViews, addRecentSearch, RecentView } from "../lib/recents";
import { colors } from "../lib/theme";

type BizSuggestion = { name: string; slug: string; city: string | null; state: string | null; categories: string[] };
type CatSuggestion = { name: string; slug: string };
type CitySuggestion = { city: string; state: string | null };

const CATEGORY_PILLS = [
  { slug: "restaurant", label: "Restaurants" },
  { slug: "coffee-shop", label: "Coffee" },
  { slug: "bar", label: "Bars" },
  { slug: "salon", label: "Salons" },
  { slug: "auto-repair", label: "Auto Repair" },
  { slug: "plumber", label: "Plumbers" },
  { slug: "gym", label: "Gyms" },
  { slug: "grocery-store", label: "Groceries" },
];

export default function SearchEntryScreen() {
  const [keyword, setKeyword] = useState("");
  const [where, setWhere] = useState("Current Location");
  const [locationEditing, setLocationEditing] = useState(false);

  const [bizResults, setBizResults] = useState<BizSuggestion[]>([]);
  const [catResults, setCatResults] = useState<CatSuggestion[]>([]);
  const [cityResults, setCityResults] = useState<CitySuggestion[]>([]);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);

  const kwDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const locDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
    getRecentViews().then(setRecentViews);
  }, []);

  // Keyword autocomplete (businesses + categories)
  useEffect(() => {
    const term = keyword.trim();
    if (term.length < 2) { setBizResults([]); setCatResults([]); return; }
    clearTimeout(kwDebounce.current);
    kwDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/public/autocomplete?q=${encodeURIComponent(term)}`));
        if (res.ok) {
          const d = await res.json();
          setBizResults(d.businesses ?? []);
          setCatResults(d.categories ?? []);
        }
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(kwDebounce.current);
  }, [keyword]);

  // Location (city) autocomplete
  useEffect(() => {
    const term = where.trim();
    if (!locationEditing || term.length < 1 || term.toLowerCase() === "current location") { setCityResults([]); return; }
    clearTimeout(locDebounce.current);
    locDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/public/autocomplete/cities?q=${encodeURIComponent(term)}`));
        if (res.ok) { const d = await res.json(); setCityResults(d.cities ?? []); }
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(locDebounce.current);
  }, [where, locationEditing]);

  function locationParam(): string {
    const w = where.trim();
    return w && w.toLowerCase() !== "current location" ? `&where=${encodeURIComponent(w)}` : "";
  }

  function runKeywordSearch(term: string) {
    const t = term.trim();
    if (!t) return;
    addRecentSearch(t);
    router.replace(`/(tabs)/search?q=${encodeURIComponent(t)}${locationParam()}`);
  }

  function openCategory(slug: string) {
    router.replace(`/(tabs)/search?category=${encodeURIComponent(slug)}${locationParam()}`);
  }

  const typing = keyword.trim().length >= 2;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingRight: 6 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.field}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.accent} />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Search for Pizza, Hair Salon, Plumbers…"
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => runKeywordSearch(keyword)}
            style={styles.fieldInput}
          />
        </View>
      </View>

      {/* Location bar */}
      <View style={styles.field}>
        <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.accent} />
        <TextInput
          value={where}
          onFocus={() => { setLocationEditing(true); if (where === "Current Location") setWhere(""); }}
          onBlur={() => { setLocationEditing(false); if (!where.trim()) setWhere("Current Location"); }}
          onChangeText={setWhere}
          placeholder="Current Location"
          placeholderTextColor={colors.accent}
          style={[styles.fieldInput, where === "Current Location" && { color: colors.accent, fontWeight: "600" }]}
        />
      </View>

      {locationEditing && cityResults.length > 0 && (
        <View style={styles.suggestBox}>
          {cityResults.map((c) => (
            <Pressable
              key={`${c.city}-${c.state ?? ""}`}
              style={styles.row}
              onPress={() => { setWhere(c.state ? `${c.city}, ${c.state}` : c.city); setLocationEditing(false); setCityResults([]); }}
            >
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.textMuted} />
              <Text style={styles.rowText}>{c.city}{c.state ? `, ${c.state}` : ""}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
        {typing ? (
          <>
            {catResults.map((c) => (
              <Pressable key={`cat-${c.slug}`} style={styles.row} onPress={() => openCategory(c.slug)}>
                <MaterialCommunityIcons name="tag-outline" size={20} color={colors.textMuted} />
                <Text style={styles.rowText}>{c.name}</Text>
              </Pressable>
            ))}
            {bizResults.map((b) => (
              <Pressable key={`biz-${b.slug}`} style={styles.row} onPress={() => router.push(`/business/${b.slug}`)}>
                <MaterialCommunityIcons name="storefront-outline" size={20} color={colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText} numberOfLines={1}>{b.name}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {[b.categories?.[0], [b.city, b.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              </Pressable>
            ))}
            {catResults.length === 0 && bizResults.length === 0 && (
              <Pressable style={styles.row} onPress={() => runKeywordSearch(keyword)}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                <Text style={styles.rowText}>Search &quot;{keyword.trim()}&quot;</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <View style={styles.pillRow}>
              {CATEGORY_PILLS.map((p) => (
                <Pressable key={p.slug} style={styles.pill} onPress={() => openCategory(p.slug)}>
                  <Text style={styles.pillText}>{p.label}</Text>
                </Pressable>
              ))}
            </View>

            {recentSearches.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text style={styles.sectionTitle}>Recently searched</Text>
                {recentSearches.map((s) => (
                  <Pressable key={s} style={styles.row} onPress={() => runKeywordSearch(s)}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={colors.textMuted} />
                    <Text style={styles.rowText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {recentViews.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text style={styles.sectionTitle}>Recently viewed businesses</Text>
                {recentViews.map((v) => (
                  <Pressable key={v.slug} style={styles.row} onPress={() => router.push(`/business/${v.slug}`)}>
                    <MaterialCommunityIcons name="storefront-outline" size={20} color={colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowText} numberOfLines={1}>{v.name}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {v.distanceMiles != null ? `${Number(v.distanceMiles).toFixed(1)} mi · ` : ""}{v.city ?? ""}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingTop: 52, paddingBottom: 8,
    backgroundColor: colors.surface,
  },
  field: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 12, marginTop: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    flex: undefined,
  },
  fieldInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  suggestBox: {
    marginHorizontal: 12, marginTop: 4,
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowText: { flex: 1, fontSize: 15, color: colors.text },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  pillText: { fontSize: 13, fontWeight: "600", color: colors.text },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 8 },
});
