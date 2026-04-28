import { useEffect, useState } from "react";
import { ScrollView, Text, View, StyleSheet, Image, ActivityIndicator } from "react-native";
import { searchBusinesses, SearchResult } from "../../lib/publicBusiness";
import BusinessCard from "../../components/BusinessCard";
import { colors } from "../../lib/theme";

export default function HomeScreen() {
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await searchBusinesses({ pageSize: 10 });
        setTrending(data.results);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Hero */}
      <View style={styles.hero}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} />
        <Text style={styles.heroTitle}>Discover businesses that</Text>
        <Text style={[styles.heroTitle, { color: colors.accent }]}>deserve recognition</Text>
        <Text style={styles.heroSubtitle}>
          Reputater is where great businesses get the praise they earn.
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Featured Businesses</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
        ) : (
          trending.map((b) => <BusinessCard key={b.id} business={b} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logo: { width: 60, height: 78, marginBottom: 16 },
  heroTitle: { color: "white", fontSize: 24, fontWeight: "900", textAlign: "center" },
  heroSubtitle: { color: "rgba(255,255,255,0.7)", marginTop: 12, textAlign: "center", fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
});
