import { View, Text, Pressable, StyleSheet, Linking, Platform } from "react-native";
import { colors } from "../lib/theme";

type Props = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
};

// A tappable location card that opens the device's Maps app. Replaces the old
// react-native-maps MapView, which hard-crashes on Android without a Google
// Maps API key configured in the manifest.
export default function BusinessLocationMap({ latitude, longitude, title, description }: Props) {
  function openInMaps() {
    const label = encodeURIComponent(title ?? "Location");
    const webFallback = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const url =
      Platform.select({
        ios: `http://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
        default: webFallback,
      }) ?? webFallback;

    Linking.openURL(url).catch(() => {
      Linking.openURL(webFallback).catch(() => {});
    });
  }

  return (
    <Pressable style={styles.container} onPress={openInMaps} accessibilityRole="button">
      <View style={styles.pin}>
        <View style={styles.pinDot} />
      </View>
      <View style={{ flex: 1 }}>
        {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
        {description ? <Text style={styles.desc} numberOfLines={2}>{description}</Text> : null}
        <Text style={styles.action}>Tap to open in Maps</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: 14,
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  action: { fontSize: 13, color: colors.accent, fontWeight: "600", marginTop: 4 },
  chevron: { fontSize: 26, color: colors.textMuted, fontWeight: "300" },
});
