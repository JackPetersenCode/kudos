import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { getPublicAd, trackAdImpression, trackAdClick, PublicAd } from "../lib/ads";
import { openExternalUrl } from "../lib/url";
import { colors } from "../lib/theme";

type Props = {
  placementSlug: string;
  category?: string;
  city?: string;
  state?: string;
  pagePath?: string;
};

export default function SponsoredBanner({ placementSlug, category, city, state, pagePath }: Props) {
  const [ad, setAd] = useState<PublicAd>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicAd({ placementSlug, category, city, state })
      .then((a) => {
        if (cancelled) return;
        setAd(a);
        if (a) trackAdImpression(a.id, placementSlug, pagePath);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [placementSlug, category, city, state, pagePath]);

  if (!ad) return null;

  const handlePress = () => {
    trackAdClick(ad.id, placementSlug, pagePath);
    if (ad.destinationUrl.startsWith("/business/")) {
      // Internal business link
      const slug = ad.destinationUrl.replace("/business/", "");
      router.push(`/business/${slug}`);
    } else {
      openExternalUrl(ad.destinationUrl);
    }
  };

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View style={styles.sponsoredRow}>
        <Text style={styles.sponsoredLabel}>SPONSORED</Text>
        <Text style={styles.businessName}>{ad.businessName}</Text>
      </View>
      {ad.imageUrl && <Image source={{ uri: ad.imageUrl }} style={styles.image} />}
      <View style={styles.body}>
        {ad.headline && <Text style={styles.headline}>{ad.headline}</Text>}
        {ad.description && <Text style={styles.description} numberOfLines={2}>{ad.description}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  sponsoredRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sponsoredLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 1,
  },
  businessName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: colors.border,
  },
  body: { padding: 12 },
  headline: { fontSize: 15, fontWeight: "700", color: colors.text },
  description: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
});
