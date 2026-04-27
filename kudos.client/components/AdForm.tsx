"use client";

import { useState } from "react";
import { uploadAdImage } from "@/lib/ads";

type BusinessOption = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  membershipRole: string;
};

type AdFormValues = {
  businessId: string;
  title: string;
  headline: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  status: string;
  startAtUtc: string;
  endAtUtc: string;
  budgetCents: string;
  pricingModel: string;
  bidCents: string;
  placementSlugs: string[];
  categorySlug: string;
  city: string;
  state: string;
};

type Props = {
  businesses: BusinessOption[];
  onSubmit: (values: AdFormValues) => Promise<void>;
  submitting?: boolean;
  initialValues?: Partial<AdFormValues>;
  mode?: "create" | "edit";
  hideCampaign?: boolean;
};

const PLACEMENTS = [
  { slug: "homepage-banner", label: "Homepage Banner" },
  { slug: "search-sponsored", label: "Search Results" },
  { slug: "business-page", label: "Business Pages" },
  { slug: "category-browse", label: "Category Browse" },
  { slug: "map-view", label: "Map View" },
];

export default function AdForm({
  businesses,
  onSubmit,
  submitting = false,
  initialValues,
  mode = "create",
  hideCampaign = false,
}: Props) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialValues?.imageUrl || null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [values, setValues] = useState<AdFormValues>({
    businessId: initialValues?.businessId ?? "",
    title: initialValues?.title ?? "",
    headline: initialValues?.headline ?? "",
    description: initialValues?.description ?? "",
    imageUrl: initialValues?.imageUrl ?? "",
    destinationUrl: initialValues?.destinationUrl ?? "",
    status: initialValues?.status ?? "draft",
    startAtUtc: initialValues?.startAtUtc ?? "",
    endAtUtc: initialValues?.endAtUtc ?? "",
    budgetCents: initialValues?.budgetCents ?? "",
    pricingModel: initialValues?.pricingModel ?? "flat",
    bidCents: initialValues?.bidCents ?? "",
    placementSlugs: initialValues?.placementSlugs ?? ["homepage-banner"],
    categorySlug: initialValues?.categorySlug ?? "",
    city: initialValues?.city ?? "",
    state: initialValues?.state ?? "",
  });

  const [error, setError] = useState("");

  function update<K extends keyof AdFormValues>(key: K, value: AdFormValues[K]) {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function togglePlacement(slug: string) {
    setValues((prev) => {
      const alreadySelected = prev.placementSlugs.includes(slug);

      return {
        ...prev,
        placementSlugs: alreadySelected
          ? prev.placementSlugs.filter((x) => x !== slug)
          : [...prev.placementSlugs, slug],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!values.businessId) {
      setError("Please select a business.");
      return;
    }

    if (!values.title.trim()) {
      setError("Please enter an ad title.");
      return;
    }

    if (!values.destinationUrl.trim()) {
      setError("Please enter a destination URL.");
      return;
    }

    if (!hideCampaign) {
      if (!values.startAtUtc || !values.endAtUtc) {
        setError("Please select a campaign start and end date.");
        return;
      }

      if (!values.budgetCents.trim()) {
        setError("Please enter a budget.");
        return;
      }

      if (values.placementSlugs.length === 0) {
        setError("Please choose at least one placement.");
        return;
      }
    }

    try {
      // Upload image to R2 if a file was selected
      if (imageFile) {
        setUploadingImage(true);
        try {
          const publicUrl = await uploadAdImage(imageFile);
          values.imageUrl = publicUrl;
        } catch {
          setError("Failed to upload image. Please try again.");
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save ad");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 14,
          padding: 20,
          background: "#fff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Ad Details</h2>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Business
            </label>
            <select
              value={values.businessId}
              onChange={(e) => update("businessId", e.target.value)}
              style={inputStyle}
            >
              <option value="">Select a business</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                  {business.city || business.state
                    ? ` — ${[business.city, business.state].filter(Boolean).join(", ")}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Ad Title
            </label>
            <input
              value={values.title}
              onChange={(e) => update("title", e.target.value)}
              style={inputStyle}
              placeholder="Summer Special Campaign"
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Headline
            </label>
            <input
              value={values.headline}
              onChange={(e) => update("headline", e.target.value)}
              style={inputStyle}
              placeholder="Try our new seasonal menu"
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              style={{ ...inputStyle, minHeight: 100 }}
              placeholder="A short sponsored message for your ad placement."
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Ad Image
            </label>
            {imagePreview && (
              <div style={{ marginBottom: 10, position: "relative", display: "inline-block" }}>
                <img
                  src={imagePreview}
                  alt="Ad preview"
                  style={{ width: 200, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid var(--color-border)" }}
                />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); update("imageUrl", ""); }}
                  style={{
                    position: "absolute", top: -6, right: -6,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "var(--color-primary)", color: "white",
                    border: "2px solid var(--color-surface)",
                    cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, lineHeight: 1, padding: 0,
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            )}
            {!imagePreview && (
              <label className="btn-outline" style={{
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", fontSize: 13,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {uploadingImage && <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 6 }}>Uploading image...</div>}
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Destination URL
            </label>
            <input
              value={values.destinationUrl}
              onChange={(e) => update("destinationUrl", e.target.value)}
              style={inputStyle}
              placeholder="https://your-site-or-landing-page"
            />
          </div>

        </div>
      </section>

      {!hideCampaign && (
        <>
          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              padding: 20,
              background: "#fff",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Campaign Settings</h2>

            <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", padding: 14, marginBottom: 16, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--color-text)" }}>How bidding works:</strong> Multiple businesses can advertise on the same placement. The highest bidder wins each impression. Your budget is a spending cap — your ad stops showing once it&apos;s spent. You&apos;re only charged for actual impressions or clicks, not upfront.
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={twoColStyle}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={values.startAtUtc}
                    onChange={(e) => update("startAtUtc", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    End
                  </label>
                  <input
                    type="datetime-local"
                    value={values.endAtUtc}
                    onChange={(e) => update("endAtUtc", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={twoColStyle}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Budget (cents)
                  </label>
                  <input
                    value={values.budgetCents}
                    onChange={(e) => update("budgetCents", e.target.value)}
                    style={inputStyle}
                    inputMode="numeric"
                    placeholder="4900"
                  />
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    {values.budgetCents ? `$${(Number(values.budgetCents) / 100).toFixed(2)}` : ""}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Pricing Model
                  </label>
                  <select
                    value={values.pricingModel}
                    onChange={(e) => update("pricingModel", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="flat">Flat Rate</option>
                    <option value="cpm">CPM (cost per 1,000 impressions)</option>
                    <option value="cpc">CPC (cost per click)</option>
                  </select>
                </div>
              </div>

              {(values.pricingModel === "cpm" || values.pricingModel === "cpc") && (
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Bid (cents) {values.pricingModel === "cpm" ? "per 1,000 impressions" : "per click"}
                  </label>
                  <input
                    value={values.bidCents}
                    onChange={(e) => update("bidCents", e.target.value)}
                    style={inputStyle}
                    inputMode="numeric"
                    placeholder="e.g. 50"
                  />
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    {values.bidCents ? `$${(Number(values.bidCents) / 100).toFixed(2)}` : ""}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Placements</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {PLACEMENTS.map((placement) => {
                    const selected = values.placementSlugs.includes(placement.slug);

                    return (
                      <button
                        key={placement.slug}
                        type="button"
                        onClick={() => togglePlacement(placement.slug)}
                        style={{
                          border: "1px solid #ccc",
                          borderRadius: 999,
                          padding: "10px 14px",
                          background: selected ? "#111" : "#fff",
                          color: selected ? "#fff" : "#111",
                          cursor: "pointer",
                        }}
                      >
                        {placement.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              padding: 20,
              background: "#fff",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Targeting (optional)</h2>
            <p style={{ color: "#666", marginTop: 0 }}>
              Leave blank to show your ad everywhere, or narrow by category and location.
            </p>

            <div style={twoColStyle}>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Category Slug
                </label>
                <input
                  value={values.categorySlug}
                  onChange={(e) => update("categorySlug", e.target.value)}
                  style={inputStyle}
                  placeholder="restaurant"
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  City
                </label>
                <input
                  value={values.city}
                  onChange={(e) => update("city", e.target.value)}
                  style={inputStyle}
                  placeholder="Austin"
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                State
              </label>
              <input
                value={values.state}
                onChange={(e) => update("state", e.target.value)}
                style={inputStyle}
                placeholder="TX"
              />
            </div>
          </section>
        </>
      )}

      {error && (
        <div
          style={{
            color: "#b00020",
            background: "#fff5f5",
            border: "1px solid #f0c7c7",
            borderRadius: 12,
            padding: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            borderRadius: 10,
            padding: "12px 16px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {submitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Ad"}
        </button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d0d0d0",
  borderRadius: 10,
  boxSizing: "border-box",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};