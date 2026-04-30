import { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Pressable, Image, TextInput, Alert, Modal } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  getOwnedBusiness,
  BusinessDetail,
  getOwnerBusinessPhotos,
  OwnerBusinessPhoto,
  uploadBusinessPhoto,
  deleteBusinessPhoto,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  getSeasonalTags,
  createSeasonalTag,
  deleteSeasonalTag,
  SeasonalTag,
} from "../../../../lib/businessOwner";
import { getStaffMembers, StaffMember } from "../../../../lib/staff";
import { colors } from "../../../../lib/theme";

export default function BusinessOwnerDashboard() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated, isReady } = useAuth();
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [photos, setPhotos] = useState<OwnerBusinessPhoto[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [seasonalTags, setSeasonalTags] = useState<SeasonalTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [staffModal, setStaffModal] = useState<{ open: boolean; editing: StaffMember | null }>({ open: false, editing: null });
  const [tagModalOpen, setTagModalOpen] = useState(false);

  const loadAll = useCallback(async (slugVal: string) => {
    try {
      const biz = await getOwnedBusiness(slugVal);
      setBusiness(biz);
      const [photoData, staffData, tagData] = await Promise.all([
        getOwnerBusinessPhotos(biz.id).catch(() => []),
        getStaffMembers(biz.id).catch(() => [] as StaffMember[]),
        getSeasonalTags(biz.id).catch(() => [] as SeasonalTag[]),
      ]);
      setPhotos(photoData);
      setStaff(staffData);
      setSeasonalTags(tagData);
    } catch (e: any) {
      Alert.alert("Couldn't load business", e?.message || "Try again");
    }
  }, []);

  const onDeleteSeasonalTag = (tag: SeasonalTag) => {
    if (!business) return;
    Alert.alert(`Remove "${tag.tagName}"?`, "This tag will no longer show on your business.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSeasonalTag(business.id, tag.id);
            setSeasonalTags((prev) => prev.filter((t) => t.id !== tag.id));
          } catch (e: any) {
            Alert.alert("Couldn't remove", e?.message || "Try again");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!slug) return;
    loadAll(slug).finally(() => setLoading(false));
  }, [isReady, isAuthenticated, slug, loadAll]);

  const pickAndUpload = async (asPrimary: boolean) => {
    if (!business) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      const fileName = asset.uri.split("/").pop() || `photo-${Date.now()}.jpg`;
      const type = asset.mimeType || "image/jpeg";
      await uploadBusinessPhoto(business.id, { uri: asset.uri, name: fileName, type, size: asset.fileSize }, asPrimary);
      const refreshed = await getOwnerBusinessPhotos(business.id);
      setPhotos(refreshed);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Try again");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onDeletePhoto = (photoId: string) => {
    if (!business) return;
    Alert.alert("Delete photo?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBusinessPhoto(business.id, photoId);
            const refreshed = await getOwnerBusinessPhotos(business.id);
            setPhotos(refreshed);
          } catch (e: any) {
            Alert.alert("Couldn't delete", e?.message || "Try again");
          }
        },
      },
    ]);
  };

  const onDeleteStaff = (member: StaffMember) => {
    if (!business) return;
    Alert.alert(`Remove ${member.firstName}?`, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteStaffMember(business.id, member.id);
            setStaff((prev) => prev.filter((s) => s.id !== member.id));
          } catch (e: any) {
            Alert.alert("Couldn't remove", e?.message || "Try again");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Not Found" }} />
        <Text style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 8 }}>
          You don&apos;t manage this business yet.
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center", marginBottom: 24, paddingHorizontal: 32 }}>
          If you own it, you&apos;ll need to claim it first.
        </Text>
        {slug && (
          <Pressable style={[styles.btn, { marginBottom: 8 }]} onPress={() => router.replace(`/claim-business/${slug}`)}>
            <Text style={styles.btnText}>Claim this business</Text>
          </Pressable>
        )}
        <Pressable onPress={() => router.replace("/dashboard")}>
          <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 14, paddingVertical: 10 }}>
            Back to My Businesses
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: business.name }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.section}>
          <Text style={styles.h1}>{business.name}</Text>
          <Text style={styles.role}>Role: {business.membershipRole}</Text>

          <View style={styles.actionsRow}>
            <Pressable style={styles.btn} onPress={() => router.push(`/dashboard/business/${business.slug}/edit`)}>
              <Text style={styles.btnText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={() => router.push(`/dashboard/business/${business.slug}/analytics`)}>
              <Text style={styles.btnText}>Analytics</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={() => router.push(`/business/${business.slug}`)}>
              <Text style={styles.btnText}>Public Page</Text>
            </Pressable>
          </View>

          {(photos.length === 0 || staff.length === 0) && (
            <Pressable
              style={styles.onboardingLink}
              onPress={() => router.push(`/dashboard/business/${business.slug}/onboarding`)}
            >
              <Text style={styles.onboardingLinkText}>👋  Run quick setup wizard →</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Photos ({photos.length})</Text>
          <Text style={styles.helper}>
            Add at least 3 photos: exterior, interior, and product or service.
          </Text>
          <View style={styles.uploadRow}>
            <Pressable style={[styles.btn, { flex: 1 }]} onPress={() => pickAndUpload(false)} disabled={uploadingPhoto}>
              <Text style={styles.btnText}>{uploadingPhoto ? "Uploading..." : "+ Add Photo"}</Text>
            </Pressable>
            <Pressable style={[styles.btn, { flex: 1 }]} onPress={() => pickAndUpload(true)} disabled={uploadingPhoto}>
              <Text style={styles.btnText}>+ Set Primary</Text>
            </Pressable>
          </View>

          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((p) => (
                <View key={p.id} style={styles.photoCard}>
                  <Image source={{ uri: p.originalUrl }} style={styles.photoImg} />
                  {p.isPrimary && <Text style={styles.primaryBadge}>Primary</Text>}
                  <Pressable style={styles.deleteBtn} onPress={() => onDeletePhoto(p.id)}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={styles.h2}>Staff ({staff.length})</Text>
            <Pressable style={styles.btnSmall} onPress={() => setStaffModal({ open: true, editing: null })}>
              <Text style={styles.btnText}>+ Add</Text>
            </Pressable>
          </View>
          {staff.length === 0 ? (
            <Text style={styles.helper}>Add team members so customers can recognize them in reviews.</Text>
          ) : (
            staff.map((m) => (
              <View key={m.id} style={styles.staffRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{m.firstName} {m.lastName}</Text>
                  {m.role && <Text style={styles.staffRole}>{m.role}</Text>}
                  <Text style={styles.staffMeta}>{m.kudosCount} kudos</Text>
                </View>
                <Pressable onPress={() => setStaffModal({ open: true, editing: m })}>
                  <Text style={styles.linkText}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => onDeleteStaff(m)} style={{ marginLeft: 14 }}>
                  <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={styles.h2}>Seasonal Tags ({seasonalTags.length})</Text>
            <Pressable style={styles.btnSmall} onPress={() => setTagModalOpen(true)}>
              <Text style={styles.btnText}>+ Add</Text>
            </Pressable>
          </View>
          <Text style={styles.helper}>
            Highlight what&apos;s happening now — limited menus, holiday hours, special events.
          </Text>
          {seasonalTags.length > 0 && (
            <View style={styles.tagWrap}>
              {seasonalTags.map((t) => (
                <Pressable key={t.id} onPress={() => onDeleteSeasonalTag(t)} style={styles.seasonalTag}>
                  <Text style={styles.seasonalTagText}>{t.tagName}</Text>
                  {t.expiresAtUtc && (
                    <Text style={styles.seasonalTagExpiry}>
                      until {new Date(t.expiresAtUtc).toLocaleDateString()}
                    </Text>
                  )}
                  <Text style={styles.seasonalTagRemove}>×</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <StaffEditorModal
        open={staffModal.open}
        editing={staffModal.editing}
        onClose={() => setStaffModal({ open: false, editing: null })}
        onSave={async (payload) => {
          if (!business) return;
          try {
            if (staffModal.editing) {
              await updateStaffMember(business.id, staffModal.editing.id, payload);
            } else {
              await createStaffMember(business.id, payload);
            }
            const refreshed = await getStaffMembers(business.id);
            setStaff(refreshed);
            setStaffModal({ open: false, editing: null });
          } catch (e: any) {
            Alert.alert("Couldn't save", e?.message || "Try again");
          }
        }}
      />

      <SeasonalTagModal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        onSave={async (tagName, expiresAtUtc) => {
          if (!business) return;
          try {
            await createSeasonalTag(business.id, { tagName, expiresAtUtc });
            const refreshed = await getSeasonalTags(business.id);
            setSeasonalTags(refreshed);
            setTagModalOpen(false);
          } catch (e: any) {
            Alert.alert("Couldn't add", e?.message || "Try again");
          }
        }}
      />
    </>
  );
}

function SeasonalTagModal({
  open, onClose, onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (tagName: string, expiresAtUtc: string | null) => Promise<void>;
}) {
  const [tagName, setTagName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("30");

  useEffect(() => {
    if (open) {
      setTagName("");
      setExpiresInDays("30");
    }
  }, [open]);

  const handleSave = async () => {
    const trimmed = tagName.trim();
    if (!trimmed) {
      Alert.alert("Tag name required", "What do you want to highlight?");
      return;
    }
    let expiresAtUtc: string | null = null;
    if (expiresInDays.trim()) {
      const days = Number(expiresInDays);
      if (!Number.isFinite(days) || days <= 0) {
        Alert.alert("Invalid expiration", "Enter a number of days, or leave blank for no expiration.");
        return;
      }
      expiresAtUtc = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }
    await onSave(trimmed, expiresAtUtc);
  };

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalHeader}>
        <Pressable onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></Pressable>
        <Text style={styles.modalTitle}>Add Seasonal Tag</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.label}>Tag</Text>
        <TextInput
          value={tagName}
          onChangeText={setTagName}
          style={styles.input}
          placeholder="e.g. Holiday Hours, Pumpkin Spice, Summer Menu"
          placeholderTextColor={colors.textMuted}
          maxLength={50}
        />

        <Text style={styles.label}>Expires in (days)</Text>
        <TextInput
          value={expiresInDays}
          onChangeText={setExpiresInDays}
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Leave blank for no expiration"
          placeholderTextColor={colors.textMuted}
        />

        <Pressable style={[styles.btn, { marginTop: 24 }]} onPress={handleSave}>
          <Text style={styles.btnText}>Add Tag</Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

function StaffEditorModal({
  open, editing, onClose, onSave,
}: {
  open: boolean;
  editing: StaffMember | null;
  onClose: () => void;
  onSave: (p: { firstName: string; lastName: string; role: string | null; photoUrl: string | null }) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (open) {
      setFirstName(editing?.firstName || "");
      setLastName(editing?.lastName || "");
      setRole(editing?.role || "");
    }
  }, [open, editing]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalHeader}>
        <Pressable onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></Pressable>
        <Text style={styles.modalTitle}>{editing ? "Edit Staff" : "Add Staff"}</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.label}>First Name</Text>
        <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />
        <Text style={styles.label}>Last Name</Text>
        <TextInput value={lastName} onChangeText={setLastName} style={styles.input} />
        <Text style={styles.label}>Role (optional)</Text>
        <TextInput value={role} onChangeText={setRole} style={styles.input} placeholder="e.g. Server, Stylist" placeholderTextColor={colors.textMuted} />
        <Pressable
          style={[styles.btn, { marginTop: 24 }]}
          onPress={() => {
            if (!firstName.trim() || !lastName.trim()) {
              Alert.alert("Missing info", "First and last name are required.");
              return;
            }
            onSave({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              role: role.trim() || null,
              photoUrl: editing?.photoUrl || null,
            });
          }}
        >
          <Text style={styles.btnText}>Save</Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  section: {
    backgroundColor: colors.surface, padding: 16, marginBottom: 12,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  h1: { fontSize: 22, fontWeight: "800", color: colors.text },
  h2: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 10 },
  role: { fontSize: 12, color: colors.textMuted, marginTop: 4, textTransform: "capitalize" },
  helper: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 12 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
  uploadRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  btn: {
    backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, alignItems: "center",
  },
  btnSmall: {
    backgroundColor: colors.accent, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 13 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoCard: { width: "48%", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  photoImg: { width: "100%", height: 120, backgroundColor: colors.border },
  primaryBadge: {
    position: "absolute", top: 6, left: 6, fontSize: 10, fontWeight: "700",
    backgroundColor: colors.accent, color: "white", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: "hidden",
  },
  deleteBtn: {
    paddingVertical: 6, alignItems: "center", backgroundColor: "#fee2e2",
  },
  deleteBtnText: { color: colors.danger, fontWeight: "700", fontSize: 12 },
  staffRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  staffName: { fontWeight: "700", color: colors.text, fontSize: 14 },
  staffRole: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  staffMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  linkText: { color: colors.accent, fontWeight: "600", fontSize: 13 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, paddingTop: 50,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontWeight: "800", fontSize: 16, color: colors.text },
  modalCancel: { color: colors.textSecondary, fontSize: 14 },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  onboardingLink: {
    marginTop: 14, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: "#fef9eb", borderWidth: 1, borderColor: colors.accent,
  },
  onboardingLinkText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  seasonalTag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: "#fef9eb", borderWidth: 1, borderColor: colors.accent,
  },
  seasonalTagText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  seasonalTagExpiry: { color: colors.textMuted, fontSize: 11, fontWeight: "500" },
  seasonalTagRemove: { color: colors.accent, fontSize: 16, fontWeight: "700", marginLeft: 2 },
});
