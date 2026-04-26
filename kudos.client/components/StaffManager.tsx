"use client";

import { useEffect, useState } from "react";
import {
  StaffMember,
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
} from "@/lib/staff";
import { uploadCommunityPhoto } from "@/lib/photos";
import { useToast } from "@/components/Toast";

type Props = {
  businessId: string;
};

export default function StaffManager({ businessId }: Props) {
  const { showToast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadStaff() {
    try {
      const data = await getStaffMembers(businessId);
      setStaff(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, [businessId]);

  function openAddForm() {
    setEditingId(null);
    setFirstName("");
    setLastName("");
    setRole("");
    setPhotoUrl("");
    setPhotoFile(null);
    setShowForm(true);
    setError("");
  }

  function openEditForm(member: StaffMember) {
    setEditingId(member.id);
    setFirstName(member.firstName);
    setLastName(member.lastName);
    setRole(member.role ?? "");
    setPhotoUrl(member.photoUrl ?? "");
    setPhotoFile(null);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let finalPhotoUrl = photoUrl.trim() || null;

      // Upload photo file if selected
      if (photoFile) {
        setUploading(true);
        try {
          const result = await uploadCommunityPhoto(businessId, photoFile);
          finalPhotoUrl = result.originalUrl;
        } catch {
          setError("Could not upload photo.");
          setSaving(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: role.trim() || null,
        photoUrl: finalPhotoUrl,
      };

      if (editingId) {
        await updateStaffMember(businessId, editingId, payload);
      } else {
        await createStaffMember(businessId, payload);
      }

      setShowForm(false);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save staff member");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(staffId: string) {
    try {
      await deleteStaffMember(businessId, staffId);
      await loadStaff();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not remove staff member", "error");
    }
  }

  if (loading) return null;

  return (
    <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #ccc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Staff Members</h2>
        <button onClick={openAddForm}>Add Staff Member</button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Staff Member" : "Add Staff Member"}</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ padding: 8 }}
            />
            <input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{ padding: 8 }}
            />
          </div>

          <input
            placeholder="Role / Title (e.g., Manager, Stylist)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 12, padding: 8, boxSizing: "border-box" }}
          />

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
              Photo (optional)
            </label>
            {photoUrl && !photoFile && (
              <div style={{ marginBottom: 8 }}>
                <img src={photoUrl} alt="Current photo" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover" }} />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
            {uploading && <div style={{ marginTop: 6, fontSize: 13, color: "var(--color-text-muted)" }}>Uploading...</div>}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Member"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>

          {error && <pre style={{ color: "red", marginTop: 8 }}>{error}</pre>}
        </form>
      )}

      {staff.length === 0 ? (
        <p>No staff members added yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {staff.map((member) => (
            <div
              key={member.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>
                  {member.firstName} {member.lastName}
                </strong>
                {member.role && <span style={{ marginLeft: 8, color: "#666" }}>- {member.role}</span>}
                <div style={{ marginTop: 4, fontSize: 14, color: "#888" }}>
                  {member.kudosCount} reviews received
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openEditForm(member)}>Edit</button>
                <button onClick={() => handleDelete(member.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
