"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { updateBusiness } from "@/lib/business";
import { getBusinessHours } from "@/lib/publicBusiness";
import { CATEGORY_TREE } from "@/lib/categoryTree";

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
  categories?: string[];
};

export default function EditBusinessPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [businessId, setBusinessId] = useState<string>("");

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const [form, setForm] = useState({
    name: "",
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
    hours: Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      openTime: "09:00",
      closeTime: "17:00",
      isClosed: false,
    })),
  });

  useEffect(() => {
    async function loadBusiness() {
      try {
        const res = await apiFetch(`/business/${slug}`, {
          method: "GET",
        });

        const data: BusinessDetail = await res.json();

        setBusinessId(data.id);

        // Load existing hours
        let hours = Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          openTime: "09:00",
          closeTime: "17:00",
          isClosed: false,
        }));

        try {
          const existingHours = await getBusinessHours(data.id);
          if (existingHours.length > 0) {
            hours = hours.map((h) => {
              const existing = existingHours.find((eh) => eh.dayOfWeek === h.dayOfWeek);
              if (existing) {
                return {
                  dayOfWeek: h.dayOfWeek,
                  openTime: existing.openTime ?? "09:00",
                  closeTime: existing.closeTime ?? "17:00",
                  isClosed: existing.isClosed,
                };
              }
              return h;
            });
          }
        } catch {
          // no hours yet
        }

        setForm({
          name: data.name ?? "",
          description: data.description ?? "",
          phone: data.phone ?? "",
          websiteUrl: data.websiteUrl ?? "",
          address1: data.address1 ?? "",
          address2: data.address2 ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          postalCode: data.postalCode ?? "",
          categorySlugs: data.categories ?? [],
          priceLevel: data.priceLevel ? String(data.priceLevel) : "",
          acceptsReservations: data.acceptsReservations,
          offersOnlineWaitlist: data.offersOnlineWaitlist,
          offersDelivery: data.offersDelivery,
          offersTakeout: data.offersTakeout,
          outdoorSeating: data.outdoorSeating,
          timeZone: data.timeZone ?? "America/Chicago",
          hours,
        });
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

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      await updateBusiness(slug, {
        name: form.name,
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
        hours: form.hours,
      });

      router.push(`/dashboard/business/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update business");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main style={{ minHeight: "100vh" }} />;
  }

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/dashboard/business/${slug}`}>← Back to business dashboard</Link>
      </div>

      <h1>Edit Business</h1>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Name *"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
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

          <div style={{ display: "grid", gap: 20 }}>
            {CATEGORY_TREE.map((group) => (
              <div key={group.slug}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  {group.name}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {group.children.map((category) => {
                    const isSelected = form.categorySlugs.includes(category.slug);

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
                          background: isSelected ? "#111" : "#fff",
                          color: isSelected ? "#fff" : "#111",
                          cursor: "pointer",
                          fontSize: 14,
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
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Not Listed?
              </div>

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

        <div style={{ marginBottom: 16 }}>
          <h3>Business Hours</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {form.hours.map((hour, idx) => (
              <div key={hour.dayOfWeek} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ width: 100 }}>{DAY_NAMES[hour.dayOfWeek]}</strong>
                <label style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    checked={hour.isClosed}
                    onChange={(e) => {
                      const updated = [...form.hours];
                      updated[idx] = { ...updated[idx], isClosed: e.target.checked };
                      setForm((prev) => ({ ...prev, hours: updated }));
                    }}
                  />
                  Closed
                </label>
                {!hour.isClosed && (
                  <>
                    <input
                      type="time"
                      value={hour.openTime}
                      onChange={(e) => {
                        const updated = [...form.hours];
                        updated[idx] = { ...updated[idx], openTime: e.target.value };
                        setForm((prev) => ({ ...prev, hours: updated }));
                      }}
                      style={{ width: 130 }}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={hour.closeTime}
                      onChange={(e) => {
                        const updated = [...form.hours];
                        updated[idx] = { ...updated[idx], closeTime: e.target.value };
                        setForm((prev) => ({ ...prev, hours: updated }));
                      }}
                      style={{ width: 130 }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-accent" style={{ padding: "12px 24px" }}>
          {saving ? "Saving..." : "Save Changes"}
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