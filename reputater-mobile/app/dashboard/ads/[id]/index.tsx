import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Image, Pressable, Alert, Platform } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../../../contexts/AuthContext";
import { getMyAd, getAdCampaigns, getAdPerformance, deleteAd, resubmitAd, toggleAdCampaign, OwnerAd, AdCampaign, AdPerformance } from "../../../../lib/ads";
import { openExternalUrl } from "../../../../lib/url";
import BarChart from "../../../../components/BarChart";
import { colors } from "../../../../lib/theme";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#f1f5f9", color: colors.textMuted },
  pending_review: { bg: "#fef3c7", color: "#b45309" },
  active: { bg: "#dcfce7", color: colors.success },
  paused: { bg: "#fed7aa", color: "#c2410c" },
  rejected: { bg: "#fee2e2", color: colors.danger },
};

export default function AdDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, isReady } = useAuth();
  const [ad, setAd] = useState<OwnerAd | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [perf, setPerf] = useState<AdPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!id) return;
    (async () => {
      try {
        const adData = await getMyAd(id);
        setAd(adData);
        const [c, p] = await Promise.all([
          getAdCampaigns(id).catch(() => [] as AdCampaign[]),
          getAdPerformance(id).catch(() => null),
        ]);
        setCampaigns(c);
        setPerf(p);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [isReady, isAuthenticated, id]);

  const onDelete = () => {
    if (!ad) return;
    Alert.alert("Delete this ad?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteAd(ad.id);
            router.back();
          } catch (e: any) {
            Alert.alert("Couldn't delete", e?.message || "Try again");
          }
        },
      },
    ]);
  };

  const onResubmit = async () => {
    if (!ad) return;
    try {
      const updated = await resubmitAd(ad.id);
      Alert.alert("Resubmitted", `Status: ${updated.status}\nDecision: ${updated.reviewDecision}`);
      const refreshed = await getMyAd(ad.id);
      setAd(refreshed);
    } catch (e: any) {
      Alert.alert("Couldn't resubmit", e?.message || "Try again");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!ad) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Ad not found.</Text>
      </View>
    );
  }

  const sc = STATUS_COLORS[ad.status] ?? STATUS_COLORS.draft;

  return (
    <>
      <Stack.Screen options={{ title: ad.title }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{ad.title}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: sc.bg, color: sc.color }]}>
              {ad.status.replace("_", " ")}
            </Text>
          </View>
          <Text style={styles.business}>{ad.businessName}</Text>

          {ad.imageUrl && <Image source={{ uri: ad.imageUrl }} style={styles.image} />}

          {ad.headline && <Text style={styles.headline}>{ad.headline}</Text>}
          {ad.description && <Text style={styles.description}>{ad.description}</Text>}

          <Pressable onPress={() => openExternalUrl(ad.destinationUrl)}>
            <Text style={styles.link}>{ad.destinationUrl}</Text>
          </Pressable>

          <View style={styles.actions}>
            <Pressable style={styles.btn} onPress={() => router.push(`/dashboard/ads/${ad.id}/edit`)}>
              <Text style={styles.btnText}>Edit</Text>
            </Pressable>
            {ad.status === "rejected" && (
              <Pressable style={styles.btn} onPress={onResubmit}>
                <Text style={styles.btnText}>Resubmit</Text>
              </Pressable>
            )}
            <Pressable style={[styles.btn, styles.btnDanger]} onPress={onDelete}>
              <Text style={styles.btnDangerText}>Delete</Text>
            </Pressable>
          </View>
        </View>

        {perf && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.perfGrid}>
              <Stat label="Impressions" value={perf.impressions.toLocaleString()} />
              <Stat label="Clicks" value={perf.clicks.toLocaleString()} />
              <Stat label="CTR" value={`${perf.ctr.toFixed(2)}%`} />
              <Stat label="Spent" value={`$${(perf.spentCents / 100).toFixed(2)}`} />
              <Stat label="Budget" value={`$${(perf.budgetCents / 100).toFixed(2)}`} />
              <Stat label="Remaining" value={`$${(perf.remainingCents / 100).toFixed(2)}`} />
            </View>

            {(() => {
              const days = Array.from(new Set(perf.byDay.map((r) => r.day))).sort();
              const impressions = days.map((d) => ({
                key: d,
                value: perf.byDay.find((r) => r.day === d && r.eventType === "impression")?.count ?? 0,
              }));
              const clicks = days.map((d) => ({
                key: d,
                value: perf.byDay.find((r) => r.day === d && r.eventType === "click")?.count ?? 0,
              }));
              return (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.subsectionTitle}>Last 30 days</Text>
                  <BarChart
                    labels={days.map((d) => d.slice(5))}
                    series={[
                      { label: "Impressions", values: impressions.map((x, i) => ({ key: days[i].slice(5), value: x.value })), color: colors.accent },
                      { label: "Clicks", values: clicks.map((x, i) => ({ key: days[i].slice(5), value: x.value })), color: colors.primary },
                    ]}
                    emptyText="No traffic in the last 30 days."
                  />
                </View>
              );
            })()}

            {(() => {
              const placements = Array.from(new Set(perf.byPlacement.map((r) => r.placementSlug)));
              const impressions = placements.map((p) => ({
                key: p,
                value: perf.byPlacement.find((r) => r.placementSlug === p && r.eventType === "impression")?.count ?? 0,
              }));
              const clicks = placements.map((p) => ({
                key: p,
                value: perf.byPlacement.find((r) => r.placementSlug === p && r.eventType === "click")?.count ?? 0,
              }));
              return (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.subsectionTitle}>By placement</Text>
                  <BarChart
                    labels={placements}
                    series={[
                      { label: "Impressions", values: impressions, color: colors.accent },
                      { label: "Clicks", values: clicks, color: colors.primary },
                    ]}
                    emptyText="No placement data yet."
                  />
                </View>
              );
            })()}
          </View>
        )}

        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Campaigns ({campaigns.length})</Text>
            <Pressable style={styles.btn} onPress={() => router.push(`/dashboard/ads/${ad.id}/campaign`)}>
              <Text style={styles.btnText}>+ New</Text>
            </Pressable>
          </View>
          {campaigns.length === 0 ? (
            <Text style={styles.empty}>
              No campaigns yet. Create one to start running this ad. Payment is completed on reputater.com.
            </Text>
          ) : (
            campaigns.map((c) => (
              <View key={c.id} style={styles.campaignRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.campaignDates}>
                    {new Date(c.startAtUtc).toLocaleDateString()} – {new Date(c.endAtUtc).toLocaleDateString()}
                  </Text>
                  <Text style={styles.campaignMeta}>
                    Budget ${(c.budgetCents / 100).toFixed(0)} · {c.pricingModel.toUpperCase()}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                    <Pressable
                      onPress={() => router.push(`/dashboard/ads/${ad.id}/campaign?campaignId=${c.id}`)}
                      hitSlop={8}
                    >
                      <Text style={styles.linkText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        try {
                          await toggleAdCampaign(c.id);
                          // Optimistic toggle
                          setCampaigns((prev) =>
                            prev.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x))
                          );
                        } catch (e: any) {
                          Alert.alert("Couldn't toggle", e?.message || "Try again");
                        }
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.linkText}>{c.isActive ? "Pause" : "Resume"}</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={[styles.statusBadge, c.isActive
                  ? { backgroundColor: "#dcfce7", color: colors.success }
                  : { backgroundColor: "#f1f5f9", color: colors.textMuted }
                ]}>
                  {c.isActive ? "Active" : "Paused"}
                </Text>
              </View>
            ))
          )}

          {/* Apple 3.1.1: no external-purchase link on iOS. */}
          {Platform.OS !== "ios" && campaigns.length > 0 && (
            <Pressable
              style={styles.payBtn}
              onPress={() => WebBrowser.openBrowserAsync(`https://reputater.com/dashboard/ads/${ad.id}`)}
            >
              <Text style={styles.payBtnText}>💳  Complete payment on web</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  section: {
    backgroundColor: colors.surface, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "800", color: colors.text, flex: 1 },
  statusBadge: {
    fontSize: 11, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: "hidden", textTransform: "capitalize",
  },
  business: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  image: { width: "100%", aspectRatio: 16 / 9, borderRadius: 8, marginVertical: 12, backgroundColor: colors.border },
  headline: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 6 },
  description: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  link: { color: colors.accent, textDecorationLine: "underline", fontSize: 13, marginBottom: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  btn: { backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  btnText: { color: "white", fontWeight: "700", fontSize: 13 },
  btnDanger: { backgroundColor: "#fee2e2" },
  btnDangerText: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  perfGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    width: "31%", padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, alignItems: "center",
  },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  campaignRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 8,
  },
  campaignDates: { fontWeight: "700", color: colors.text, fontSize: 13 },
  campaignMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  helperLink: { fontSize: 12, color: colors.textMuted, marginTop: 12, fontStyle: "italic" },
  linkText: { color: colors.accent, fontWeight: "600", fontSize: 13 },
  subsectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 },
  payBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 999,
    backgroundColor: "#fef9eb", borderWidth: 1, borderColor: colors.accent, alignItems: "center",
  },
  payBtnText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
});
