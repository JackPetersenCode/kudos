"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { uploadBusinessPhoto } from "@/lib/photos";
import { createStaffMember } from "@/lib/staff";
import RequireAuth from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";

type BusinessDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  websiteUrl: string | null;
};

function OnboardingContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { showToast } = useToast();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  // Step 1: Photos
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Step 2: Staff
  const [staffFirstName, setStaffFirstName] = useState("");
  const [staffLastName, setStaffLastName] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [addedStaff, setAddedStaff] = useState<string[]>([]);

  // Step 3: Details (handled on edit page)
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/business/${slug}`, { method: "GET" });
        const data = await res.json();
        setBusiness(data);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  async function handleUploadPhotos() {
    if (!business || photoFiles.length === 0) return;
    setUploadingPhotos(true);
    try {
      for (let i = 0; i < photoFiles.length; i++) {
        await uploadBusinessPhoto(business.id, photoFiles[i], i === 0);
      }
      setPhotoFiles([]);
      setStep(2);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function handleAddStaff() {
    if (!business || !staffFirstName.trim() || !staffLastName.trim()) return;
    setSaving(true);
    try {
      await createStaffMember(business.id, {
        firstName: staffFirstName.trim(),
        lastName: staffLastName.trim(),
        role: staffRole.trim() || null,
      });
      setAddedStaff([...addedStaff, `${staffFirstName} ${staffLastName}`]);
      setStaffFirstName("");
      setStaffLastName("");
      setStaffRole("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main style={{ minHeight: "100vh" }} />;
  if (!business) return <main className="page-container">Business not found.</main>;

  const totalSteps = 3;

  return (
    <main className="page-container" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/dashboard/business/${slug}`}>← Back to dashboard</Link>
      </div>

      <h1 style={{ marginBottom: 8 }}>Set Up {business.name}</h1>
      <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
        Complete these steps to make your business page shine.
      </p>

      {/* Progress */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              background: i < step ? "var(--color-accent)" : "var(--color-border)",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>

      {/* Step 1: Photos */}
      {step === 1 && (
        <div className="section-card">
          <h2 style={{ marginTop: 0 }}>Step 1: Add Photos</h2>
          <p style={{ color: "var(--color-text-secondary)" }}>
            Upload at least one photo of your business. The first photo becomes your primary image.
          </p>

          <div style={{ display: "grid", gap: 8, marginBottom: 16, color: "var(--color-text-secondary)", fontSize: 14 }}>
            <div>Exterior photo so people can recognize you</div>
            <div>Interior photo to show the atmosphere</div>
            <div>Product or service photo to show what you offer</div>
          </div>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
            style={{ marginBottom: 16 }}
          />

          {photoFiles.length > 0 && (
            <div style={{ marginBottom: 16, fontSize: 14, color: "var(--color-text-secondary)" }}>
              {photoFiles.length} file{photoFiles.length === 1 ? "" : "s"} selected
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleUploadPhotos}
              disabled={uploadingPhotos || photoFiles.length === 0}
              className="btn-accent"
            >
              {uploadingPhotos ? "Uploading..." : "Upload & Continue"}
            </button>
            <button onClick={() => setStep(2)} className="btn-ghost">
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Staff */}
      {step === 2 && (
        <div className="section-card">
          <h2 style={{ marginTop: 0 }}>Step 2: Add Your Team</h2>
          <p style={{ color: "var(--color-text-secondary)" }}>
            Add staff members so customers can leave reviews for specific people.
          </p>

          {addedStaff.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {addedStaff.map((name, i) => (
                <div key={i} className="tag-success" style={{ display: "inline-block", marginRight: 8, marginBottom: 8 }}>
                  {name} added
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input placeholder="First name" value={staffFirstName} onChange={(e) => setStaffFirstName(e.target.value)} />
            <input placeholder="Last name" value={staffLastName} onChange={(e) => setStaffLastName(e.target.value)} />
          </div>

          <input
            placeholder="Role (e.g., Manager, Stylist)"
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button onClick={handleAddStaff} disabled={saving || !staffFirstName.trim() || !staffLastName.trim()} className="btn-outline">
              {saving ? "Adding..." : "Add Team Member"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setStep(3)} className="btn-accent">
              Continue
            </button>
            <button onClick={() => setStep(1)} className="btn-ghost">Back</button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div className="section-card" style={{ textAlign: "center" }}>
          <h2 style={{ marginTop: 0, fontSize: 28 }}>You&apos;re all set!</h2>
          <p style={{ color: "var(--color-text-secondary)", maxWidth: 400, margin: "0 auto 24px" }}>
            Your business page is ready. You can always edit your details, add more photos,
            and manage your team from the dashboard.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={`/business/${slug}`} className="btn-accent" style={{ textDecoration: "none", padding: "12px 24px" }}>
              View Your Page
            </Link>
            <Link href={`/dashboard/business/${slug}/edit`} className="btn-outline" style={{ textDecoration: "none", padding: "12px 24px" }}>
              Edit Details
            </Link>
            <Link href={`/dashboard/business/${slug}`} className="btn-ghost" style={{ textDecoration: "none", padding: "12px 24px" }}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <OnboardingContent />
    </RequireAuth>
  );
}
