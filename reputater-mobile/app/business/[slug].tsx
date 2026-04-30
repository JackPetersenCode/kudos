import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, Image, ActivityIndicator, StyleSheet, Linking, Pressable, Platform, Alert, Modal, TextInput } from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import {
  getBusiness, getBusinessReviews, getBusinessPhotos, PublicBusiness, Review,
  deleteBusinessReview, markReviewHelpful, unmarkReviewHelpful, flagReview, createReviewResponse,
} from "../../lib/publicBusiness";
import { useAuth } from "../../contexts/AuthContext";
import { getTaterLevel } from "../../lib/taterLevel";
import { addFavorite, removeFavorite, getFavoriteStatus, checkIn, getCheckInCount } from "../../lib/features";
import { getStaffMembers, StaffMember } from "../../lib/staff";
import { getOwnedBusinesses, getSeasonalTags, SeasonalTag } from "../../lib/businessOwner";
import { openExternalUrl } from "../../lib/url";
import StaffSection from "../../components/StaffSection";
import { colors } from "../../lib/theme";

const FLAG_REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "conflict-of-interest", label: "Conflict of interest" },
  { value: "false-information", label: "False information" },
  { value: "other", label: "Other" },
];

const PLACEHOLDER = "https://pub-e3a9c8c4ae654841ba1d956cb83dc898.r2.dev/placeholders/default.jpg";

export default function BusinessDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [photos, setPhotos] = useState<{ id: string; originalUrl: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [checkInCount, setCheckInCount] = useState(0);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [seasonalTags, setSeasonalTags] = useState<SeasonalTag[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [flagModal, setFlagModal] = useState<{ open: boolean; reviewId: string | null }>({ open: false, reviewId: null });
  const [responseModal, setResponseModal] = useState<{ open: boolean; reviewId: string | null }>({ open: false, reviewId: null });

  const reloadReviews = useCallback(async (businessId: string) => {
    try {
      const data = await getBusinessReviews(businessId);
      setReviews(data.reviews);
    } catch { /* ignore */ }
  }, []);

  // Load business + reviews + photos + checkins (no auth required)
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const biz = await getBusiness(slug);
        setBusiness(biz);
        const [reviewData, photoData, checkinData, staffData, tagData] = await Promise.all([
          getBusinessReviews(biz.id).catch(() => ({ reviews: [], reviewCount: 0 })),
          getBusinessPhotos(biz.id).catch(() => []),
          getCheckInCount(biz.id).catch(() => ({ totalCheckIns: 0, uniqueUsers: 0 })),
          getStaffMembers(biz.id).catch(() => [] as StaffMember[]),
          getSeasonalTags(biz.id).catch(() => [] as SeasonalTag[]),
        ]);
        setReviews(reviewData.reviews);
        setPhotos(photoData);
        setCheckInCount(checkinData.totalCheckIns);
        setStaff(staffData);
        setSeasonalTags(tagData);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Determine if current user owns this business
  useEffect(() => {
    if (!business || !isAuthenticated) {
      setIsOwner(false);
      return;
    }
    getOwnedBusinesses()
      .then((owned) => setIsOwner(owned.some((b) => b.id === business.id)))
      .catch(() => setIsOwner(false));
  }, [business, isAuthenticated]);

  const onToggleHelpful = async (review: Review) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    // Optimistic update
    setReviews((prev) => prev.map((r) =>
      r.id === review.id
        ? { ...r, isMarkedHelpful: !r.isMarkedHelpful, helpfulCount: r.helpfulCount + (r.isMarkedHelpful ? -1 : 1) }
        : r
    ));
    try {
      if (review.isMarkedHelpful) await unmarkReviewHelpful(review.id);
      else await markReviewHelpful(review.id);
    } catch (e: any) {
      // Revert on failure
      setReviews((prev) => prev.map((r) =>
        r.id === review.id
          ? { ...r, isMarkedHelpful: review.isMarkedHelpful, helpfulCount: review.helpfulCount }
          : r
      ));
      Alert.alert("Couldn't update", e?.message || "Try again");
    }
  };

  const onDeleteReview = (review: Review) => {
    if (!business) return;
    Alert.alert("Delete your review?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBusinessReview(business.id, review.id);
            setReviews((prev) => prev.filter((r) => r.id !== review.id));
          } catch (e: any) {
            Alert.alert("Couldn't delete", e?.message || "Try again");
          }
        },
      },
    ]);
  };

  // Re-check favorite status when auth or business changes
  useEffect(() => {
    if (!business || !isAuthenticated) {
      setIsFavorited(false);
      return;
    }
    getFavoriteStatus(business.id)
      .then((s) => setIsFavorited(s.isFavorited))
      .catch(() => {});
  }, [business, isAuthenticated]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: "Not Found" }} />
        <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>Business not found.</Text>
        <Pressable onPress={() => router.replace("/(tabs)/search")}>
          <Text style={{ color: colors.accent, fontWeight: "600" }}>Search businesses</Text>
        </Pressable>
      </View>
    );
  }

  const photoUrl = photos[0]?.originalUrl || PLACEHOLDER;

  return (
    <>
      <Stack.Screen options={{ title: business.name }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Image source={{ uri: photoUrl }} style={styles.heroPhoto} />

        <View style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{business.name}</Text>
            <Text style={[styles.tag, business.isOpenNow ? styles.tagOpen : styles.tagClosed]}>
              {business.isOpenNow ? "Open" : "Closed"}
            </Text>
          </View>

          {seasonalTags.length > 0 && (
            <View style={styles.seasonalRow}>
              {seasonalTags.map((t) => (
                <Text key={t.id} style={styles.seasonalChip}>✨ {t.tagName}</Text>
              ))}
            </View>
          )}

          {business.description && (
            <Text style={styles.description}>{business.description}</Text>
          )}

          <View style={styles.contactRow}>
            {business.phone && (
              <Pressable style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${business.phone}`)}>
                <Text style={styles.contactText}>📞 {business.phone}</Text>
              </Pressable>
            )}
            {business.websiteUrl && (
              <Pressable style={styles.contactBtn} onPress={() => openExternalUrl(business.websiteUrl!)}>
                <Text style={styles.contactText}>🌐 Website</Text>
              </Pressable>
            )}
          </View>

          {(business.address1 || business.city) && (() => {
            const fullAddress = [business.address1, business.city, business.state, business.postalCode].filter(Boolean).join(", ");
            const mapsUrl = Platform.select({
              ios: `maps://0,0?q=${encodeURIComponent(business.name)}@${encodeURIComponent(fullAddress)}`,
              android: `geo:0,0?q=${encodeURIComponent(`${business.name}, ${fullAddress}`)}`,
              default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
            })!;
            return (
              <Pressable onPress={() => Linking.openURL(mapsUrl)}>
                <Text style={styles.address}>📍 {fullAddress}</Text>
              </Pressable>
            );
          })()}

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, isFavorited && styles.actionBtnActive]}
              onPress={async () => {
                if (!business) return;
                if (!isAuthenticated) { router.push("/login"); return; }
                try {
                  if (isFavorited) {
                    await removeFavorite(business.id);
                    setIsFavorited(false);
                  } else {
                    await addFavorite(business.id);
                    setIsFavorited(true);
                  }
                } catch { /* ignore */ }
              }}
            >
              <Text style={[styles.actionBtnText, isFavorited && styles.actionBtnTextActive]}>
                {isFavorited ? "♥ Saved" : "♡ Save"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.actionBtn}
              onPress={async () => {
                if (!business) return;
                if (!isAuthenticated) { router.push("/login"); return; }
                try {
                  await checkIn(business.id);
                  const counts = await getCheckInCount(business.id);
                  setCheckInCount(counts.totalCheckIns);
                } catch { /* ignore */ }
              }}
            >
              <Text style={styles.actionBtnText}>📍 Check In{checkInCount > 0 ? ` · ${checkInCount}` : ""}</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.reviewBtn}
            onPress={() => {
              if (!isAuthenticated) {
                router.push("/login");
                return;
              }
              router.push(`/write-review/${slug}`);
            }}
          >
            <Text style={styles.reviewBtnText}>✏️  Write a Review</Text>
          </Pressable>

          <Pressable
            style={styles.claimBtn}
            onPress={() => {
              if (!isAuthenticated) {
                router.push("/login");
                return;
              }
              router.push(`/claim-business/${slug}`);
            }}
          >
            <Text style={styles.claimBtnText}>Own this business? Claim it</Text>
          </Pressable>
        </View>

        {photos.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {photos.slice(0, 10).map((p) => (
                <Image key={p.id} source={{ uri: p.originalUrl }} style={styles.thumb} />
              ))}
            </ScrollView>
          </View>
        )}

        <StaffSection staff={staff} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          {reviews.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No reviews yet — be the first!</Text>
          ) : (
            reviews.slice(0, 10).map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Pressable onPress={() => router.push(`/profile/${r.userId}`)} style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <Text style={[styles.reviewName, { color: colors.accent }]}>{r.displayName}</Text>
                    <View style={styles.taterBadge}>
                      <Image source={{ uri: getTaterLevel(r.userReviewCount).image }} style={{ width: 14, height: 14 }} />
                      <Text style={styles.taterBadgeText}>{getTaterLevel(r.userReviewCount).name}</Text>
                    </View>
                  </Pressable>
                  <Text style={styles.reviewDate}>{new Date(r.createdAtUtc).toLocaleDateString()}</Text>
                </View>
                {r.positiveTags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {r.positiveTags.map((tag) => (
                      <Text key={tag} style={styles.reviewTag}>{tag}</Text>
                    ))}
                  </View>
                )}
                {r.title && <Text style={styles.reviewTitle}>{r.title}</Text>}
                {r.body && <Text style={styles.reviewBody}>{r.body}</Text>}

                {r.businessResponse && (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseLabel}>Response from {business.name}</Text>
                    <Text style={styles.responseBody}>{r.businessResponse.body}</Text>
                    <Text style={styles.responseDate}>
                      {new Date(r.businessResponse.createdAtUtc).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View style={styles.reviewActions}>
                  <Pressable onPress={() => onToggleHelpful(r)} hitSlop={8}>
                    <Text style={[styles.actionLink, r.isMarkedHelpful && styles.actionLinkActive]}>
                      {r.isMarkedHelpful ? "♥" : "♡"} Helpful{r.helpfulCount > 0 ? ` · ${r.helpfulCount}` : ""}
                    </Text>
                  </Pressable>

                  {r.isOwnReview && slug && (
                    <>
                      <Pressable onPress={() => router.push(`/write-review/${slug}?reviewId=${r.id}`)} hitSlop={8}>
                        <Text style={styles.actionLink}>Edit</Text>
                      </Pressable>
                      <Pressable onPress={() => onDeleteReview(r)} hitSlop={8}>
                        <Text style={[styles.actionLink, { color: colors.danger }]}>Delete</Text>
                      </Pressable>
                    </>
                  )}

                  {!r.isOwnReview && isAuthenticated && (
                    <Pressable onPress={() => setFlagModal({ open: true, reviewId: r.id })} hitSlop={8}>
                      <Text style={styles.actionLink}>Flag</Text>
                    </Pressable>
                  )}

                  {isOwner && !r.businessResponse && (
                    <Pressable onPress={() => setResponseModal({ open: true, reviewId: r.id })} hitSlop={8}>
                      <Text style={[styles.actionLink, { color: colors.accent }]}>Respond</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <FlagModal
        open={flagModal.open}
        onClose={() => setFlagModal({ open: false, reviewId: null })}
        onSubmit={async (reason, details) => {
          if (!business || !flagModal.reviewId) return;
          try {
            await flagReview(business.id, flagModal.reviewId, { reason, details });
            setFlagModal({ open: false, reviewId: null });
            Alert.alert("Reported", "Thanks — we'll review it.");
          } catch (e: any) {
            Alert.alert("Couldn't report", e?.message || "Try again");
          }
        }}
      />

      <ResponseModal
        open={responseModal.open}
        onClose={() => setResponseModal({ open: false, reviewId: null })}
        onSubmit={async (body) => {
          if (!business || !responseModal.reviewId) return;
          try {
            await createReviewResponse(business.id, responseModal.reviewId, body);
            await reloadReviews(business.id);
            setResponseModal({ open: false, reviewId: null });
          } catch (e: any) {
            Alert.alert("Couldn't post response", e?.message || "Try again");
          }
        }}
      />
    </>
  );
}

function FlagModal({
  open, onClose, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string | null) => Promise<void>;
}) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("spam");
      setDetails("");
    }
  }, [open]);

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Report Review</Text>
          <Text style={styles.modalSubtitle}>Why are you reporting this review?</Text>

          {FLAG_REASONS.map((r) => (
            <Pressable
              key={r.value}
              style={[styles.reasonRow, reason === r.value && styles.reasonRowActive]}
              onPress={() => setReason(r.value)}
            >
              <View style={[styles.radio, reason === r.value && styles.radioActive]} />
              <Text style={styles.reasonLabel}>{r.label}</Text>
            </Pressable>
          ))}

          <Text style={[styles.modalSubtitle, { marginTop: 12 }]}>Details (optional)</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            multiline
            placeholder="Tell us more..."
            placeholderTextColor={colors.textMuted}
            style={styles.modalInput}
          />

          <View style={styles.modalActions}>
            <Pressable style={styles.modalGhost} onPress={onClose}>
              <Text style={styles.modalGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalPrimary, submitting && { opacity: 0.6 }]}
              disabled={submitting}
              onPress={async () => {
                setSubmitting(true);
                try {
                  await onSubmit(reason, details.trim() || null);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <Text style={styles.modalPrimaryText}>{submitting ? "Reporting..." : "Submit Report"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ResponseModal({
  open, onClose, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) setBody(""); }, [open]);

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Respond to Review</Text>
          <Text style={styles.modalSubtitle}>
            Thank the reviewer or share more about your business. This response will be public.
          </Text>

          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="Thanks for the kind words..."
            placeholderTextColor={colors.textMuted}
            style={[styles.modalInput, { minHeight: 120 }]}
            maxLength={1000}
          />

          <View style={styles.modalActions}>
            <Pressable style={styles.modalGhost} onPress={onClose}>
              <Text style={styles.modalGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalPrimary, (submitting || !body.trim()) && { opacity: 0.6 }]}
              disabled={submitting || !body.trim()}
              onPress={async () => {
                setSubmitting(true);
                try {
                  await onSubmit(body.trim());
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <Text style={styles.modalPrimaryText}>{submitting ? "Posting..." : "Post Response"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  heroPhoto: { width: "100%", height: 220, backgroundColor: colors.border },
  section: { padding: 16, backgroundColor: colors.surface, marginBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, flex: 1 },
  tag: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, fontWeight: "600", overflow: "hidden" },
  tagOpen: { backgroundColor: "#ecfdf5", color: colors.success },
  tagClosed: { backgroundColor: "#f1f5f9", color: colors.textMuted },
  description: { color: colors.textSecondary, marginTop: 8, lineHeight: 22 },
  contactRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  contactBtn: { backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  contactText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  address: { color: colors.accent, marginTop: 12, fontSize: 13, textDecorationLine: "underline" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  thumb: { width: 120, height: 120, borderRadius: 8, backgroundColor: colors.border },
  reviewCard: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewName: { fontWeight: "700", color: colors.text, fontSize: 14 },
  reviewDate: { color: colors.textMuted, fontSize: 12 },
  tagsRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  reviewTag: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "#fff7e6", color: colors.accent, fontWeight: "600", overflow: "hidden" },
  reviewTitle: { fontWeight: "700", color: colors.text, marginTop: 6 },
  reviewBody: { color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  reviewBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12, borderRadius: 999, marginTop: 16, alignItems: "center",
  },
  reviewBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  claimBtn: {
    paddingVertical: 10, alignItems: "center", marginTop: 10,
  },
  claimBtnText: { color: colors.textMuted, fontSize: 12, textDecorationLine: "underline" },
  taterBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    backgroundColor: "#fef9eb",
  },
  taterBadgeText: { fontSize: 10, color: colors.accent, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: "center",
  },
  actionBtnActive: { backgroundColor: "#fef9eb", borderColor: colors.accent },
  actionBtnText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  actionBtnTextActive: { color: colors.accent },
  responseBox: {
    marginTop: 10, padding: 12, borderRadius: 10,
    backgroundColor: "#fef9eb", borderLeftWidth: 3, borderLeftColor: colors.accent,
  },
  responseLabel: { fontSize: 11, fontWeight: "700", color: colors.accent, textTransform: "uppercase", letterSpacing: 0.5 },
  responseBody: { color: colors.text, fontSize: 13, lineHeight: 18, marginTop: 4 },
  responseDate: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  reviewActions: { flexDirection: "row", gap: 16, marginTop: 10, flexWrap: "wrap" },
  actionLink: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  actionLinkActive: { color: colors.accent },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: "center", marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  reasonRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, marginBottom: 6,
  },
  reasonRowActive: { backgroundColor: "#fef9eb", borderColor: colors.accent },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.border },
  radioActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  reasonLabel: { color: colors.text, fontSize: 14, flex: 1 },
  modalInput: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, fontSize: 14, color: colors.text, minHeight: 80,
  },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  modalGhost: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  modalGhostText: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
  modalPrimary: { flex: 2, backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  modalPrimaryText: { color: "white", fontWeight: "700", fontSize: 14 },
  seasonalRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  seasonalChip: {
    fontSize: 12, fontWeight: "700", color: colors.accent,
    backgroundColor: "#fef9eb", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, overflow: "hidden",
  },
});
