import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, Alert, Switch, Platform } from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { createBusiness, slugify, BusinessHourInput } from "../lib/businessOwner";
import { CATEGORY_TREE } from "../lib/categoryTree";
import { colors } from "../lib/theme";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PRICE_OPTIONS = [
  { value: "", label: "—" },
  { value: "1", label: "$" },
  { value: "2", label: "$$" },
  { value: "3", label: "$$$" },
  { value: "4", label: "$$$$" },
];

const FEATURE_FIELDS = [
  { key: "acceptsReservations", label: "Reservations" },
  { key: "offersOnlineWaitlist", label: "Online Waitlist" },
  { key: "offersDelivery", label: "Delivery" },
  { key: "offersTakeout", label: "Takeout" },
  { key: "outdoorSeating", label: "Outdoor Seating" },
] as const;

type Form = {
  name: string;
  slug: string;
  description: string;
  phone: string;
  websiteUrl: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  categorySlug: string;
  priceLevel: string;
  acceptsReservations: boolean;
  offersOnlineWaitlist: boolean;
  offersDelivery: boolean;
  offersTakeout: boolean;
  outdoorSeating: boolean;
  timeZone: string;
  hours: BusinessHourInput[];
};

const DEFAULT_HOURS: BusinessHourInput[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i, openTime: "09:00", closeTime: "17:00", isClosed: false,
}));

export default function NewBusinessScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Form>({
    name: "", slug: "", description: "", phone: "", websiteUrl: "",
    address1: "", address2: "", city: "", state: "", postalCode: "",
    categorySlug: "", priceLevel: "",
    acceptsReservations: false, offersOnlineWaitlist: false, offersDelivery: false,
    offersTakeout: false, outdoorSeating: false,
    timeZone: "America/Chicago",
    hours: DEFAULT_HOURS,
  });

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated]);

  const updateField = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  const updateName = (name: string) => {
    setForm((p) => ({ ...p, name, slug: slugTouched ? p.slug : slugify(name) }));
  };

  const updateSlug = (slug: string) => {
    setSlugTouched(true);
    setForm((p) => ({ ...p, slug: slugify(slug) }));
  };

  const updateHour = (idx: number, patch: Partial<BusinessHourInput>) => {
    setForm((p) => {
      const next = [...p.hours];
      next[idx] = { ...next[idx], ...patch };
      return { ...p, hours: next };
    });
  };

  const onSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert("Name required", "Enter the business name.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createBusiness({
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        description: form.description.trim() || null,
        phone: form.phone.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
        address1: form.address1.trim() || null,
        address2: form.address2.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        postalCode: form.postalCode.trim() || null,
        categorySlugs: form.categorySlug ? [form.categorySlug] : [],
        priceLevel: form.priceLevel ? Number(form.priceLevel) : null,
        acceptsReservations: form.acceptsReservations,
        offersOnlineWaitlist: form.offersOnlineWaitlist,
        offersDelivery: form.offersDelivery,
        offersTakeout: form.offersTakeout,
        outdoorSeating: form.outdoorSeating,
        timeZone: form.timeZone,
        hours: form.hours,
      });
      Alert.alert(
        "Business added!",
        result.claimed
          ? "Your business is live."
          : "If you own this business, you can claim it now to manage the listing.",
        [
          {
            text: result.claimed ? "Manage" : "Claim it",
            onPress: () => router.replace(
              result.claimed
                ? `/dashboard/business/${result.slug}/onboarding`
                : `/claim-business/${result.slug}`
            ),
          },
          { text: "View page", onPress: () => router.replace(`/business/${result.slug}`) },
        ]
      );
    } catch (e: any) {
      Alert.alert("Couldn't create business", e?.message || "Try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Add a Business" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <View style={styles.section}>
          <Text style={styles.intro}>
            Add a business to Reputater. You don&apos;t have to be the owner — you can claim it later.
          </Text>
        </View>

        <Section title="Basics">
          <Field label="Name *">
            <TextInput style={styles.input} value={form.name} onChangeText={updateName} />
          </Field>
          <Field label="URL slug">
            <TextInput
              style={styles.input}
              value={form.slug}
              onChangeText={updateSlug}
              autoCapitalize="none"
              placeholder="auto-generated"
              placeholderTextColor={colors.textMuted}
            />
          </Field>
          <Field label="Description">
            <TextInput style={[styles.input, { minHeight: 90 }]} multiline value={form.description} onChangeText={(t) => updateField("description", t)} />
          </Field>
          <Field label="Phone">
            <TextInput style={styles.input} value={form.phone} onChangeText={(t) => updateField("phone", t)} keyboardType="phone-pad" />
          </Field>
          <Field label="Website URL">
            <TextInput style={styles.input} value={form.websiteUrl} onChangeText={(t) => updateField("websiteUrl", t)} autoCapitalize="none" keyboardType="url" />
          </Field>
        </Section>

        <Section title="Category">
          {CATEGORY_TREE.map((group) => (
            <View key={group.slug} style={{ marginBottom: 12 }}>
              <Text style={styles.groupLabel}>{group.name}</Text>
              <View style={styles.chipRow}>
                {group.children.map((c) => {
                  const active = form.categorySlug === c.slug;
                  return (
                    <Pressable
                      key={c.slug}
                      onPress={() => updateField("categorySlug", active ? "" : c.slug)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </Section>

        <Section title="Price Level">
          <View style={styles.chipRow}>
            {PRICE_OPTIONS.map((p) => {
              const active = form.priceLevel === p.value;
              return (
                <Pressable
                  key={p.value || "none"}
                  onPress={() => updateField("priceLevel", p.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Features">
          {FEATURE_FIELDS.map((f) => (
            <View key={f.key} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{f.label}</Text>
              <Switch
                value={form[f.key]}
                onValueChange={(v) => updateField(f.key, v)}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
          ))}
        </Section>

        <Section title="Address">
          <Field label="Address 1">
            <TextInput style={styles.input} value={form.address1} onChangeText={(t) => updateField("address1", t)} />
          </Field>
          <Field label="Address 2">
            <TextInput style={styles.input} value={form.address2} onChangeText={(t) => updateField("address2", t)} />
          </Field>
          <Field label="City">
            <TextInput style={styles.input} value={form.city} onChangeText={(t) => updateField("city", t)} />
          </Field>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="State">
                <TextInput style={styles.input} value={form.state} onChangeText={(t) => updateField("state", t)} autoCapitalize="characters" maxLength={2} />
              </Field>
            </View>
            <View style={{ flex: 2 }}>
              <Field label="Postal Code">
                <TextInput style={styles.input} value={form.postalCode} onChangeText={(t) => updateField("postalCode", t)} keyboardType="number-pad" />
              </Field>
            </View>
          </View>
          <Field label="Time Zone">
            <TextInput style={styles.input} value={form.timeZone} onChangeText={(t) => updateField("timeZone", t)} autoCapitalize="none" />
          </Field>
        </Section>

        <Section title="Business Hours">
          {form.hours.map((h, idx) => (
            <View key={h.dayOfWeek} style={styles.hourRow}>
              <Text style={styles.dayLabel}>{DAY_NAMES[h.dayOfWeek]}</Text>
              <View style={styles.hourControls}>
                <Pressable
                  onPress={() => updateHour(idx, { isClosed: !h.isClosed })}
                  style={[styles.chip, h.isClosed && styles.chipActive]}
                >
                  <Text style={[styles.chipText, h.isClosed && styles.chipTextActive]}>
                    {h.isClosed ? "Closed" : "Open"}
                  </Text>
                </Pressable>
                {!h.isClosed && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <TextInput
                      value={h.openTime ?? "09:00"}
                      onChangeText={(t) => updateHour(idx, { openTime: t })}
                      style={[styles.input, styles.timeInput]}
                      placeholder="09:00"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={{ color: colors.textMuted }}>–</Text>
                    <TextInput
                      value={h.closeTime ?? "17:00"}
                      onChangeText={(t) => updateHour(idx, { closeTime: t })}
                      style={[styles.input, styles.timeInput]}
                      placeholder="17:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}
              </View>
            </View>
          ))}
        </Section>

        <Pressable style={[styles.saveBtn, submitting && { opacity: 0.6 }]} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.saveBtnText}>{submitting ? "Creating..." : "Create Business"}</Text>
        </Pressable>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 12,
  },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  groupLabel: { fontWeight: "700", color: colors.text, fontSize: 13, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.text, fontWeight: "500" },
  chipTextActive: { color: "white", fontWeight: "700" },
  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 14, color: colors.text },
  hourRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  dayLabel: { fontWeight: "700", color: colors.text, fontSize: 13, marginBottom: 6 },
  hourControls: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  timeInput: { width: 80, paddingVertical: 8, fontSize: 13 },
  saveBtn: {
    backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 999,
    alignItems: "center", marginTop: 8,
  },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
