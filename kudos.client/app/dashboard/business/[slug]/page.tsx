"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { logout } from "@/lib/auth";
import { getBusinessPhotos, uploadBusinessPhoto, deleteBusinessPhoto, BusinessPhoto } from "@/lib/photos";
import StaffManager from "@/components/StaffManager";
import SeasonalTagManager from "@/components/SeasonalTagManager";
import BusinessQRCode from "@/components/BusinessQRCode";

type BusinessDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  websiteUrl: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  priceLevel: number | null;
  acceptsReservations: boolean;
  offersOnlineWaitlist: boolean;
  offersDelivery: boolean;
  offersTakeout: boolean;
  outdoorSeating: boolean;
  timeZone: string;
  createdAtUtc: string;
  membershipRole: "owner" | "admin" | "manager";
};

export default function BusinessDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  async function loadPhotos(businessId: string) {
    setPhotosLoading(true);
    try {
      const data = await getBusinessPhotos(businessId);
      setPhotos(data);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not load photos");
    } finally {
      setPhotosLoading(false);
    }
  }

  useEffect(() => {
    async function loadBusiness() {
      try {
        const res = await apiFetch(`/business/${slug}`, {
          method: "GET",
        });
        const data = await res.json();
        setBusiness(data);
        await loadPhotos(data.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load business");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadBusiness();
    }
  }, [slug]);

  async function handlePhotoUpload() {
    if (!business || !selectedFile) {
      setUploadError("Please choose a file first.");
      return;
    }

    setUploadError("");
    setUploadSuccess("");
    setUploading(true);

    try {
      await uploadBusinessPhoto(business.id, selectedFile, isPrimary);
      await loadPhotos(business.id);
      setSelectedFile(null);
      setIsPrimary(false);
      setUploadSuccess("Photo uploaded successfully.");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!business) return;

    setUploadError("");
    setUploadSuccess("");
    setDeletingPhotoId(photoId);

    try {
      await deleteBusinessPhoto(business.id, photoId);
      await loadPhotos(business.id);
      setUploadSuccess("Photo deleted successfully.");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingPhotoId(null);
    }
  }

  if (loading) {
    return <main style={{ minHeight: "100vh" }} />;
  }

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Business Dashboard</h1>
        <pre style={{ color: "red" }}>{error}</pre>
        <div style={{ marginTop: 16 }}>
          <Link href="/dashboard">Back to dashboard</Link>
        </div>
      </main>
    );
  }

  if (!business) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Business Dashboard</h1>
        <p>Business not found.</p>
        <div style={{ marginTop: 16 }}>
          <Link href="/dashboard">Back to dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard">← Back to dashboard</Link>
      </div>
      <div style={{ marginTop: 12, marginBottom: 20 }}>
        <Link href={`/dashboard/business/${slug}/edit`}>Edit business</Link>
      </div>
      <h1>{business.name}</h1>
      <p>
        <strong>Role:</strong> {business.membershipRole}
      </p>

      <div style={{ marginTop: 24 }}>
        <p><strong>Slug:</strong> {business.slug}</p>
        <p><strong>Description:</strong> {business.description ?? "No description provided"}</p>
        <p><strong>Phone:</strong> {business.phone ?? "No phone provided"}</p>
        <p><strong>Website:</strong> {business.websiteUrl ?? "No website provided"}</p>
        <p><strong>Address 1:</strong> {business.address1 ?? "—"}</p>
        <p><strong>Address 2:</strong> {business.address2 ?? "—"}</p>
        <p><strong>City:</strong> {business.city ?? "—"}</p>
        <p><strong>State:</strong> {business.state ?? "—"}</p>
        <p><strong>Postal Code:</strong> {business.postalCode ?? "—"}</p>
        <p><strong>Latitude:</strong> {business.latitude ?? "—"}</p>
        <p><strong>Longitude:</strong> {business.longitude ?? "—"}</p>
        <p><strong>Price Level:</strong> {business.priceLevel ? "$".repeat(business.priceLevel) : "—"}</p>
        <p><strong>Created:</strong> {new Date(business.createdAtUtc).toLocaleString()}</p>
      </div>

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #ccc" }}>
        <div
          style={{
            marginBottom: 16,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
            background: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Add at least 3 photos to get started
          </div>
        
          <div style={{ color: "#555", marginBottom: 10 }}>
            Businesses look more complete and trustworthy when they have a variety of photos.
          </div>
        
          <div style={{ display: "grid", gap: 6, color: "#444" }}>
            <div>• Exterior photo so people can recognize the business</div>
            <div>• Interior photo to show the atmosphere or space</div>
            <div>• Product or service photo to show what you offer</div>
          </div>
        </div>
        <h2>Upload Photos</h2>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setSelectedFile(file);
          }}
        />

        <div style={{ marginTop: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
            />{" "}
            Make this the primary photo
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={handlePhotoUpload} disabled={uploading || !selectedFile}>
            {uploading ? "Uploading..." : "Upload Photo"}
          </button>
        </div>

        {uploadError && (
          <pre style={{ color: "red", marginTop: 12 }}>{uploadError}</pre>
        )}

        {uploadSuccess && (
          <pre style={{ color: "green", marginTop: 12 }}>{uploadSuccess}</pre>
        )}
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Uploaded Photos</h2>

        {photosLoading ? (
          <p>Loading photos...</p>
        ) : photos.length === 0 ? (
          <p>No photos uploaded yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  border: "1px solid #ddd",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <img
                  src={photo.originalUrl}
                  alt="Business photo"
                  style={{ width: "100%", height: 180, objectFit: "contain", background: "#f5f5f5", borderRadius: 6 }}
                />
                <div style={{ marginTop: 8 }}>
                  {photo.isPrimary ? <strong>Primary Photo</strong> : "Secondary Photo"}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                  {new Date(photo.createdAtUtc).toLocaleString()}
                </div>
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    disabled={deletingPhotoId === photo.id}
                  >
                    {deletingPhotoId === photo.id ? "Deleting..." : "Delete Photo"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StaffManager businessId={business.id} />

      <SeasonalTagManager businessId={business.id} />

      <BusinessQRCode slug={business.slug} businessName={business.name} />

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #ccc" }}>
        <h2>Analytics</h2>
        <Link href={`/dashboard/business/${slug}/analytics`}>View Business Analytics</Link>
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          Logout
        </button>
      </div>
    </main>
  );
}