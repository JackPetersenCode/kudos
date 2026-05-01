import { useEffect, useMemo, useState } from "react";
import { View, TextInput, FlatList, Text, StyleSheet, Pressable, ScrollView, Modal } from "react-native";
import { router } from "expo-router";
import BusinessCard from "../../components/BusinessCard";
import SponsoredBanner from "../../components/SponsoredBanner";
import { ListSkeleton } from "../../components/Skeleton";
import { searchBusinesses, SearchResult, SearchCityCount, SearchCategoryCount } from "../../lib/publicBusiness";
import { colors } from "../../lib/theme";

const PRICE_OPTIONS = [
  { value: "", label: "Any Price" },
  { value: "1", label: "$" },
  { value: "2", label: "$$" },
  { value: "3", label: "$$$" },
  { value: "4", label: "$$$$" },
];

const RATING_OPTIONS = [
  { value: "", label: "Any" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "4.5", label: "4.5+" },
];

const RADIUS_OPTIONS = [
  { value: "", label: "Any Distance" },
  { value: "5", label: "5 mi" },
  { value: "10", label: "10 mi" },
  { value: "25", label: "25 mi" },
  { value: "50", label: "50 mi" },
  { value: "100", label: "100 mi" },
];

const SORT_OPTIONS = [
  { value: "", label: "Most Reviewed" },
  { value: "distance", label: "Nearest" },
  { value: "rating", label: "Highest Rated" },
  { value: "name", label: "Name (A-Z)" },
  { value: "newest", label: "Newest" },
];

const FEATURE_FILTERS = [
  { key: "openNow", label: "Open Now" },
  { key: "reservations", label: "Reservations" },
  { key: "onlineWaitlist", label: "Online Waitlist" },
  { key: "delivery", label: "Delivery" },
  { key: "takeout", label: "Takeout" },
  { key: "outdoorSeating", label: "Outdoor Seating" },
] as const;

type FeatureKey = typeof FEATURE_FILTERS[number]["key"];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [where, setWhere] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [cityCounts, setCityCounts] = useState<SearchCityCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<SearchCategoryCount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    openNow: false,
    reservations: false,
    onlineWaitlist: false,
    delivery: false,
    takeout: false,
    outdoorSeating: false,
  });

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (city) n++;
    if (category) n++;
    if (price) n++;
    if (minRating) n++;
    if (radiusMiles) n++;
    if (sortBy) n++;
    n += Object.values(features).filter(Boolean).length;
    return n;
  }, [city, category, price, minRating, radiusMiles, sortBy, features]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const noQuery = !query.trim() && !where.trim();
      const noFilters = activeFilterCount === 0;
      if (noQuery && noFilters) {
        setResults([]);
        setCityCounts([]);
        setCategoryCounts([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      try {
        const data = await searchBusinesses({
          q: query,
          where,
          city,
          category,
          price: price ? Number(price) : undefined,
          minRating: minRating ? Number(minRating) : undefined,
          radiusMiles: radiusMiles ? Number(radiusMiles) : undefined,
          sort: sortBy || undefined,
          openNow: features.openNow,
          reservations: features.reservations,
          onlineWaitlist: features.onlineWaitlist,
          delivery: features.delivery,
          takeout: features.takeout,
          outdoorSeating: features.outdoorSeating,
          pageSize: 30,
        });
        setResults(data.results);
        setCityCounts(data.cityCounts);
        setCategoryCounts(data.categoryCounts);
        setTotalCount(data.totalCount);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, where, city, category, price, minRating, radiusMiles, sortBy, features, activeFilterCount]);

  const clearFilters = () => {
    setCity(""); setCategory(""); setPrice(""); setMinRating(""); setRadiusMiles(""); setSortBy("");
    setFeatures({ openNow: false, reservations: false, onlineWaitlist: false, delivery: false, takeout: false, outdoorSeating: false });
  };

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
        <Pressable style={styles.filterBtn} onPress={() => setFiltersOpen(true)}>
          <Text style={styles.filterBtnText}>
            🎚 Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Text>
        </Pressable>
      </View>

      {loading && (
        <View style={{ padding: 16 }}>
          <ListSkeleton count={3} />
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <>
            {searched && (
              <SponsoredBanner placementSlug="search-sponsored" category={category} city={city} pagePath="/search" />
            )}
            {searched && totalCount > 0 ? (
              <Text style={styles.resultsCount}>{totalCount} result{totalCount === 1 ? "" : "s"}</Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => <BusinessCard business={item} />}
        ListEmptyComponent={
          !loading && searched ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>No businesses found.</Text>
              <Pressable style={styles.addBusinessBtn} onPress={() => router.push("/add-business")}>
                <Text style={styles.addBusinessText}>+ Add a Business</Text>
              </Pressable>
              <Text style={styles.addBusinessHint}>You don&apos;t have to be the owner.</Text>
            </View>
          ) : !loading ? (
            <Text style={styles.empty}>Type to search or apply filters.</Text>
          ) : null
        }
        ListFooterComponent={
          searched && results.length > 0 ? (
            <Pressable style={styles.addBusinessFooter} onPress={() => router.push("/add-business")}>
              <Text style={styles.addBusinessFooterText}>Can&apos;t find it? + Add a Business</Text>
            </Pressable>
          ) : null
        }
      />

      <Modal visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalHeader}>
          <Pressable onPress={() => setFiltersOpen(false)}><Text style={styles.modalCancel}>Cancel</Text></Pressable>
          <Text style={styles.modalTitle}>Filters</Text>
          <Pressable onPress={clearFilters}><Text style={styles.modalClear}>Clear</Text></Pressable>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {cityCounts.length > 0 && (
            <FilterGroup label="City">
              <FilterChip label="All Cities" active={city === ""} onPress={() => setCity("")} />
              {cityCounts.slice(0, 12).map((c) => (
                <FilterChip
                  key={c.city}
                  label={`${c.city} (${c.count})`}
                  active={city === c.city}
                  onPress={() => setCity(city === c.city ? "" : c.city)}
                />
              ))}
            </FilterGroup>
          )}

          {categoryCounts.length > 0 && (
            <FilterGroup label="Category">
              {categoryCounts.slice(0, 20).map((c) => (
                <FilterChip
                  key={c.slug}
                  label={`${c.name} (${c.count})`}
                  active={category === c.slug}
                  onPress={() => setCategory(category === c.slug ? "" : c.slug)}
                />
              ))}
            </FilterGroup>
          )}

          <FilterGroup label="Price">
            {PRICE_OPTIONS.map((o) => (
              <FilterChip key={o.value || "any-price"} label={o.label} active={price === o.value} onPress={() => setPrice(o.value)} />
            ))}
          </FilterGroup>

          <FilterGroup label="Minimum Rating">
            {RATING_OPTIONS.map((o) => (
              <FilterChip key={o.value || "any-rating"} label={o.label} active={minRating === o.value} onPress={() => setMinRating(o.value)} />
            ))}
          </FilterGroup>

          <FilterGroup label="Distance">
            {RADIUS_OPTIONS.map((o) => (
              <FilterChip key={o.value || "any-distance"} label={o.label} active={radiusMiles === o.value} onPress={() => setRadiusMiles(o.value)} />
            ))}
          </FilterGroup>

          <FilterGroup label="Sort By">
            {SORT_OPTIONS.map((o) => (
              <FilterChip key={o.value || "default-sort"} label={o.label} active={sortBy === o.value} onPress={() => setSortBy(o.value)} />
            ))}
          </FilterGroup>

          <FilterGroup label="Features">
            {FEATURE_FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                label={f.label}
                active={features[f.key]}
                onPress={() => setFeatures({ ...features, [f.key]: !features[f.key] })}
              />
            ))}
          </FilterGroup>
        </ScrollView>
        <View style={styles.modalFooter}>
          <Pressable style={styles.applyBtn} onPress={() => setFiltersOpen(false)}>
            <Text style={styles.applyBtnText}>Show {totalCount > 0 ? `${totalCount} ` : ""}results</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {active ? "✓ " : ""}{label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBar: { backgroundColor: colors.primary, padding: 12 },
  input: { color: "white", fontSize: 14, paddingVertical: 10, paddingHorizontal: 12 },
  filterBtn: {
    marginTop: 8, alignSelf: "flex-start",
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  filterBtnText: { color: "white", fontWeight: "600", fontSize: 13 },
  resultsCount: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
  emptyWrap: { alignItems: "center", paddingTop: 32 },
  addBusinessBtn: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999,
    backgroundColor: colors.accent,
  },
  addBusinessText: { color: "white", fontWeight: "700", fontSize: 14 },
  addBusinessHint: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  addBusinessFooter: {
    marginTop: 16, paddingVertical: 14, alignItems: "center",
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  addBusinessFooterText: { color: colors.accent, fontWeight: "600", fontSize: 13 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, paddingTop: 50,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontWeight: "800", fontSize: 16, color: colors.text },
  modalCancel: { color: colors.textSecondary, fontSize: 14 },
  modalClear: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  modalFooter: {
    padding: 16, paddingBottom: 32,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  applyBtn: {
    backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 999, alignItems: "center",
  },
  applyBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
  groupLabel: { fontWeight: "700", fontSize: 14, color: colors.text, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "500" },
  chipTextActive: { color: "white", fontWeight: "700" },
});
