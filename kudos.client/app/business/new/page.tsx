"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBusiness } from "@/lib/business";
import { slugify } from "@/lib/slug";

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

      router.push(`/dashboard/business/${created.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create business");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <h1>Create Business</h1>

      <form onSubmit={handleSubmit}>
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
          <h3>Categories</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {CATEGORY_OPTIONS.map((category) => (
              <label key={category.slug} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={form.categorySlugs.includes(category.slug)}
                  onChange={() => toggleCategory(category.slug)}
                />
                {category.label}
              </label>
            ))}
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

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Business"}
        </button>
      </form>

      {error && (
        <pre style={{ color: "red", marginTop: 16 }}>
          {error}
        </pre>
      )}
    </main>
  );
}