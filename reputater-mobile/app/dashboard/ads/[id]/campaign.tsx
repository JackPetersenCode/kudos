import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  createAdCampaign, updateAdCampaign, getCampaignDetail, CreateCampaignPayload,
} from "../../../../lib/ads";
import { CATEGORY_TREE } from "../../../../lib/categoryTree";
import { colors } from "../../../../lib/theme";

const PLACEMENTS: { slug: string; label: string; desc: string }[] = [
  { slug: "homepage-banner", label: "Homepage Banner", desc: "Top of the home screen, all visitors" },
  { slug: "search-sponsored", label: "Search Results", desc: "Top of search results matching your category/city" },
  { slug: "business-detail", label: "Business Detail Page", desc: "On other businesses' detail pages" },
];

const PRICING: { value: "cpc" | "cpm" | "flat"; label: string; desc: string }[] = [
  { value: "flat", label: "Flat Rate", desc: "Fixed budget. Ad runs until end date or budget reached." },
  { value: "cpc", label: "Cost per Click", desc: "Pay only when users tap your ad." },
  { value: "cpm", label: "Cost per 1000 Impressions", desc: "Pay per 1000 views regardless of taps." },
];

const DURATIONS = [
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
];

export default function CampaignEditorScreen() {
  const { id: adId, campaignId } = useLocalSearchParams<{ id: string; campaignId?: string }>();
  const isEditing = !!campaignId;
  const { isAuthenticated, isReady } = useAuth();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [budgetDollars, setBudgetDollars] = useState("25");
  const [bidDollars, setBidDollars] = useState("");
  const [pricingModel, setPricingModel] = useState<"cpc" | "cpm" | "flat">("flat");
  const [durationDays, setDurationDays] = useState(7);
  const [placementSlugs, setPlacementSlugs] = useState<string[]>(["homepage-banner"]);
  const [categorySlug, setCategorySlug] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isEditing || !campaignId) return;
    getCampaignDetail(campaignId)
      .then((c) => {
        setBudgetDollars((c.budgetCents / 100).toFixed(0));
        setBidDollars(c.bidCents != null ? (c.bidCents / 100).toFixed(2) : "");
        setPricingModel(c.pricingModel as "cpc" | "cpm" | "flat");
        const start = new Date(c.startAtUtc).getTime();
        const end = new Date(c.endAtUtc).getTime();
        const days = Math.max(1, Math.round((end - start) / 86400000));
        setDurationDays(days);
        setPlacementSlugs(c.placementSlugs);
        setCategorySlug(c.targeting.categorySlug ?? "");
        setCity(c.targeting.city ?? "");
        setState(c.targeting.state ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isReady, isAuthenticated, isEditing, campaignId]);

  const togglePlacement = (slug: string) => {
    setPlacementSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const onSave = async () => {
    if (!adId) return;
    const budget = Number(budgetDollars);
    if (!Number.isFinite(budget) || budget < 5) {
      Alert.alert("Budget too low", "Minimum budget is $5.");
      return;
    }
    if (placementSlugs.length === 0) {
      Alert.alert("Pick a placement", "Select at least one placement for your ad.");
      return;
    }
    if ((pricingModel === "cpc" || pricingModel === "cpm") && (!bidDollars || Number(bidDollars) <= 0)) {
      Alert.alert("Bid required", `${pricingModel.toUpperCase()} pricing requires a per-event bid amount.`);
      return;
    }

    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + durationDays * 86400000);

    const payload: CreateCampaignPayload = {
      startAtUtc: startAt.toISOString(),
      endAtUtc: endAt.toISOString(),
      budgetCents: Math.round(budget * 100),
      pricingModel,
      bidCents: pricingModel === "flat" ? null : Math.round(Number(bidDollars) * 100),
      placementSlugs,
      categorySlug: categorySlug.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
    };

    setSaving(true);
    try {
      if (isEditing && campaignId) {
        await updateAdCampaign(campaignId, payload);
      } else {
        await createAdCampaign(adId, payload);
      }
      Alert.alert(
        isEditing ? "Campaign updated" : "Campaign created",
        isEditing
          ? "Your changes are live."
          : "Complete payment to start serving this ad.",
        isEditing
          ? [{ text: "OK", onPress: () => router.back() }]
          : [
              {
                text: "Pay now",
                onPress: async () => {
                  await WebBrowser.openBrowserAsync(`https://reputater.com/dashboard/ads/${adId}`);
                  router.back();
                },
              },
              { text: "Pay later", onPress: () => router.back(), style: "cancel" },
            ]
      );
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message || "Try again");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isEditing ? "Edit Campaign" : "New Campaign" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <Section title="Placements">
          <Text style={styles.helper}>Where should your ad appear?</Text>
          {PLACEMENTS.map((p) => {
            const active = placementSlugs.includes(p.slug);
            return (
              <Pressable
                key={p.slug}
                style={[styles.optionRow, active && styles.optionRowActive]}
                onPress={() => togglePlacement(p.slug)}
              >
                <View style={[styles.checkbox, active && styles.checkboxActive]}>
                  {active && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{p.label}</Text>
                  <Text style={styles.optionDesc}>{p.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </Section>

        <Section title="Pricing Model">
          {PRICING.map((p) => {
            const active = pricingModel === p.value;
            return (
              <Pressable
                key={p.value}
                style={[styles.optionRow, active && styles.optionRowActive]}
                onPress={() => setPricingModel(p.value)}
              >
                <View style={[styles.radio, active && styles.radioActive]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{p.label}</Text>
                  <Text style={styles.optionDesc}>{p.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </Section>

        <Section title="Budget">
          <Text style={styles.label}>Total budget (USD)</Text>
          <View style={styles.dollarInput}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              value={budgetDollars}
              onChangeText={setBudgetDollars}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="25"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          {(pricingModel === "cpc" || pricingModel === "cpm") && (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>
                Bid per {pricingModel === "cpc" ? "click" : "1000 impressions"} (USD)
              </Text>
              <View style={styles.dollarInput}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  value={bidDollars}
                  onChangeText={setBidDollars}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  placeholder={pricingModel === "cpc" ? "0.50" : "5.00"}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </>
          )}
        </Section>

        <Section title="Duration">
          <View style={styles.chipRow}>
            {DURATIONS.map((d) => {
              const active = durationDays === d.days;
              return (
                <Pressable
                  key={d.days}
                  onPress={() => setDurationDays(d.days)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Targeting (optional)">
          <Text style={styles.helper}>Leave blank to show ads everywhere.</Text>

          <Text style={[styles.label, { marginTop: 8 }]}>Category</Text>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setCategorySlug("")}
              style={[styles.chip, categorySlug === "" && styles.chipActive]}
            >
              <Text style={[styles.chipText, categorySlug === "" && styles.chipTextActive]}>Any</Text>
            </Pressable>
            {CATEGORY_TREE.map((g) => (
              <Pressable
                key={g.slug}
                onPress={() => setCategorySlug(categorySlug === g.slug ? "" : g.slug)}
                style={[styles.chip, categorySlug === g.slug && styles.chipActive]}
              >
                <Text style={[styles.chipText, categorySlug === g.slug && styles.chipTextActive]}>{g.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <View style={{ flex: 2 }}>
              <Text style={styles.label}>City</Text>
              <TextInput value={city} onChangeText={setCity} style={styles.inputBox} placeholder="Austin" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>State</Text>
              <TextInput value={state} onChangeText={setState} style={styles.inputBox} placeholder="TX" placeholderTextColor={colors.textMuted} maxLength={2} autoCapitalize="characters" />
            </View>
          </View>
        </Section>

        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Campaign"}
          </Text>
        </Pressable>

        {!isEditing && (
          <Text style={styles.paymentNote}>
            After creating, complete payment at reputater.com/dashboard/ads on desktop. Your ad starts serving once payment clears.
          </Text>
        )}
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  section: {
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  helper: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 6 },
  optionRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8, backgroundColor: colors.bg,
  },
  optionRowActive: { borderColor: colors.accent, backgroundColor: "#fef9eb" },
  optionTitle: { fontWeight: "700", color: colors.text, fontSize: 14 },
  optionDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  checkboxActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkboxMark: { color: "white", fontSize: 14, fontWeight: "800" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dollarInput: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12,
  },
  dollarSign: { color: colors.textSecondary, fontSize: 16, fontWeight: "700", marginRight: 6 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text },
  inputBox: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.text, fontWeight: "500" },
  chipTextActive: { color: "white", fontWeight: "700" },
  saveBtn: {
    backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 999, alignItems: "center",
  },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
  paymentNote: {
    color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 18,
    paddingHorizontal: 16,
  },
});
