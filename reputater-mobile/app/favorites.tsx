import { useEffect, useState } from "react";
import { FlatList, View, Text, StyleSheet, ActivityIndicator, Image, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { getFavorites, Favorite } from "../lib/features";
import { colors } from "../lib/theme";

const PLACEHOLDER = "https://pub-e3a9c8c4ae654841ba1d956cb83dc898.r2.dev/placeholders/default.jpg";

export default function FavoritesScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    getFavorites()
      .then(setFavorites)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isReady, isAuthenticated]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Saved Businesses" }} />
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.businessId}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/business/${item.businessSlug}`)}
          >
            <Image
              source={{ uri: item.primaryPhotoUrl || PLACEHOLDER }}
              style={styles.photo}
            />
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>{item.businessName}</Text>
              <Text style={styles.location} numberOfLines={1}>
                {[item.city, item.state].filter(Boolean).join(", ") || "Location not listed"}
              </Text>
              <Text style={styles.date}>
                Saved {new Date(item.favoritedAt).toLocaleDateString()}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>You haven&apos;t saved any businesses yet.</Text>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  card: {
    flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: "hidden",
  },
  photo: { width: 100, height: 100, backgroundColor: colors.border },
  body: { flex: 1, padding: 12, justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  location: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
