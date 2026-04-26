"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBusiness } from "@/lib/business";
import { slugify } from "@/lib/slug";
import { CATEGORY_TREE } from "@/lib/categoryTree";

const CATEGORY_OPTIONS = [
  { label: "Restaurant", slug: "restaurant" },
  { label: "Coffee Shop", slug: "coffee-shop" },
  { label: "Bakery", slug: "bakery" },
  { label: "Bar", slug: "bar" },
  { label: "Fruit Stand", slug: "fruit-stand" },
  { label: "Florist", slug: "florist" },
  { label: "Gym", slug: "gym" },
  { label: "Salon", slug: "salon" },
  { label: "Barber Shop", slug: "barber-shop" },
  { label: "Bookstore", slug: "bookstore" },
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function NewBusinessPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    phone: "",
    websiteUrl: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    categorySlugs: [] as string[],
    priceLevel: "",
    acceptsReservations: false,
    offersOnlineWaitlist: false,
    offersDelivery: false,
    offersTakeout: false,
    outdoorSeating: false,
    timeZone: "America/Chicago",
    hours: DAY_NAMES.map((_, index) => ({
      dayOfWeek: index,
      openTime: "09:00",
      closeTime: "17:00",
      isClosed: false,
    })),
  });

  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setForm((prev) => ({
      ...prev,
      slug: slugify(value),
    }));
  }

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function toggleCategory(slug: string) {
    setForm((prev) => ({
      ...prev,
      categorySlugs: prev.categorySlugs.includes(slug)
        ? prev.categorySlugs.filter((x) => x !== slug)
        : [...prev.categorySlugs, slug],
    }));
  }

  function updateHour(index: number, field: "openTime" | "closeTime" | "isClosed", value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      hours: prev.hours.map((hour, i) =>
        i === index ? { ...hour, [field]: value } : hour
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const created = await createBusiness({
        name: form.name,
        slug: form.slug || null,
        description: form.description || null,
        phone: form.phone || null,
        websiteUrl: form.websiteUrl || null,
        address1: form.address1 || null,
        address2: form.address2 || null,
        city: form.city || null,
        state: form.state || null,
        postalCode: form.postalCode || null,
        categorySlugs: form.categorySlugs,
        priceLevel: form.priceLevel ? Number(form.priceLevel) : null,
        acceptsReservations: form.acceptsReservations,
        offersOnlineWaitlist: form.offersOnlineWaitlist,
        offersDelivery: form.offersDelivery,
        offersTakeout: form.offersTakeout,
        outdoorSeating: form.outdoorSeating,
        timeZone: form.timeZone,
        hours: form.hours.map((hour) => ({
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.isClosed ? null : hour.openTime,
          closeTime: hour.isClosed ? null : hour.closeTime,
          isClosed: hour.isClosed,
        })),
      });

      router.push(`/business/${created.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create business");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-container-medium">
      <h1>Add a Business</h1>
      <p style={{ color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 24 }}>
        Know a great business that&apos;s not on Reputater yet? Add it so others can discover it too.
        You don&apos;t need to be the owner — anyone can contribute a listing.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <input
          placeholder="Name *"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />

        <input
          placeholder="Slug"
          value={form.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8, minHeight: 100 }}
        />

        <div style={{ marginBottom: 16 }}>
          <h3>Business Category</h3>
          
          <div style={{ display: "grid", gap: 16 }}>
            {CATEGORY_TREE.map((group) => (
              <div key={group.slug}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{group.name}</div>
            
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {group.children.map((category) => {
                    const selected = form.categorySlugs.includes(category.slug);
                  
                    return (
                      <button
                        key={category.slug}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            categorySlugs: [category.slug],
                          }))
                        }
                        style={{
                          border: "1px solid #ccc",
                          borderRadius: 999,
                          padding: "8px 12px",
                          background: selected ? "#111" : "#fff",
                          color: selected ? "#fff" : "#111",
                          cursor: "pointer",
                        }}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Fallback</div>
          
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    categorySlugs: ["other"],
                  }))
                }
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 999,
                  padding: "8px 12px",
                  background: form.categorySlugs.includes("other") ? "#111" : "#fff",
                  color: form.categorySlugs.includes("other") ? "#fff" : "#111",
                  cursor: "pointer",
                }}
              >
                Other
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Price Level</label>
          <select
            value={form.priceLevel}
            onChange={(e) => updateField("priceLevel", e.target.value)}
            style={{ padding: 8, borderRadius: 8 }}
          >
            <option value="">Select price</option>
            <option value="1">$</option>
            <option value="2">$$</option>
            <option value="3">$$$</option>
            <option value="4">$$$$</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Time Zone</label>
          <input
            value={form.timeZone}
            onChange={(e) => updateField("timeZone", e.target.value)}
            style={{ display: "block", width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <h3>Features</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <label><input type="checkbox" checked={form.acceptsReservations} onChange={(e) => updateField("acceptsReservations", e.target.checked)} /> Reservations</label>
            <label><input type="checkbox" checked={form.offersOnlineWaitlist} onChange={(e) => updateField("offersOnlineWaitlist", e.target.checked)} /> Offers Online Waitlist</label>
            <label><input type="checkbox" checked={form.offersDelivery} onChange={(e) => updateField("offersDelivery", e.target.checked)} /> Offers Delivery</label>
            <label><input type="checkbox" checked={form.offersTakeout} onChange={(e) => updateField("offersTakeout", e.target.checked)} /> Offers Takeout</label>
            <label><input type="checkbox" checked={form.outdoorSeating} onChange={(e) => updateField("outdoorSeating", e.target.checked)} /> Outdoor Seating</label>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3>Hours</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {form.hours.map((hour, index) => (
              <div
                key={hour.dayOfWeek}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 120px 120px 120px",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <strong>{DAY_NAMES[hour.dayOfWeek]}</strong>

                <input
                  type="time"
                  value={hour.openTime}
                  disabled={hour.isClosed}
                  onChange={(e) => updateHour(index, "openTime", e.target.value)}
                />

                <input
                  type="time"
                  value={hour.closeTime}
                  disabled={hour.isClosed}
                  onChange={(e) => updateHour(index, "closeTime", e.target.value)}
                />

                <label>
                  <input
                    type="checkbox"
                    checked={hour.isClosed}
                    onChange={(e) => updateHour(index, "isClosed", e.target.checked)}
                  />{" "}
                  Closed
                </label>
              </div>
            ))}
          </div>
        </div>

        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />

        <input
          placeholder="Website URL"
          value={form.websiteUrl}
          onChange={(e) => updateField("websiteUrl", e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />

        <input
          placeholder="Address 1"
          value={form.address1}
          onChange={(e) => updateField("address1", e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />

        <input
          placeholder="Address 2"
          value={form.address2}
          onChange={(e) => updateField("address2", e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />

        <input
          placeholder="City"
          value={form.city}
          onChange={(e) => updateField("city", e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />

        <input
          placeholder="State"
          value={form.state}
          onChange={(e) => updateField("state", e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />

        <input
          placeholder="Postal Code"
          value={form.postalCode}
          onChange={(e) => updateField("postalCode", e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />

        <div className="section-card" style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent)", padding: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)" }}>
            By adding this business, you&apos;re helping the community discover it. You won&apos;t have management access —
            if you&apos;re the owner, you can claim the listing after it&apos;s created using the &quot;Claim this business&quot; button.
          </p>
        </div>

        <button type="submit" disabled={loading} className="btn-accent" style={{ padding: "12px 24px" }}>
          {loading ? "Adding..." : "Add Business"}
        </button>
      </form>

      {error && <div className="error-message" style={{ marginTop: 16 }}>{error}</div>}
    </main>
  );
}