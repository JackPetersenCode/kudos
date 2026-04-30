import { Linking, Alert } from "react-native";

// Prefix https:// when a user-entered URL has no scheme.
// Otherwise Android can't find an Intent handler and throws.
export function normalizeWebUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function openExternalUrl(raw: string) {
  const url = normalizeWebUrl(raw);
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Couldn't open link", url);
  }
}
