import { useEffect, useState } from "react";
import { View, TextInput, FlatList, Text, StyleSheet, ActivityIndicator } from "react-native";
import BusinessCard from "../../components/BusinessCard";
import { searchBusinesses, SearchResult } from "../../lib/publicBusiness";
import { colors } from "../../lib/theme";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [where, setWhere] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim() && !where.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      try {
        const data = await searchBusinesses({ q: query.trim(), where: where.trim(), pageSize: 30 });
        setResults(data.results);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, where]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.searchBar}>
        <TextInput
          placeholder="Search businesses..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={query}
          onChangeText={setQuery}
          style={styles.input}
        />
        <TextInput
          placeholder="City, state, or zip"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={where}
          onChangeText={setWhere}
          style={[styles.input, { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }]}
        />
      </View>

      {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => <BusinessCard business={item} />}
        ListEmptyComponent={
          !loading && searched ? (
            <Text style={styles.empty}>No businesses found.</Text>
          ) : !loading ? (
            <Text style={styles.empty}>Type to search businesses.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: { backgroundColor: colors.primary, padding: 12 },
  input: {
    color: "white",
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
