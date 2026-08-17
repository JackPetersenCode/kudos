"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdForm from "@/components/AdForm";
import { getMyAd, updateAd, OwnerAd } from "@/lib/ads";
import { apiFetch } from "@/lib/api";

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
  params: Promise<{ id: string }>;
};

export default function EditAdPage({ params }: Props) {
  const router = useRouter();

  const [adId, setAdId] = useState("");
  const [ad, setAd] = useState<OwnerAd | null>(null);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const p = await params;
      setAdId(p.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (!adId) return;

    async function loadPage() {
      try {
        const [adData, businessesRes] = await Promise.all([
          getMyAd(adId),
          apiFetch(`/Profile/business`, { cache: "no-store" }),
        ]);

        const businessesData = await businessesRes.json();

        setAd(adData);
        setBusinesses(businessesData ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load ad");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [adId]);

  async function handleSubmit(values: AdFormValues) {
    if (!ad) return;

    setSaving(true);
    setError("");

    try {
      await updateAd(ad.id, {
        title: values.title,
        headline: values.headline || null,
        description: values.description || null,
        imageUrl: values.imageUrl || null,
        destinationUrl: values.destinationUrl,
        status: values.status,
      });

      router.push(`/dashboard/ads/${ad.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update ad");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href={ad ? `/dashboard/ads/${ad.id}` : "/dashboard/ads"}>
          ← Back
        </Link>
      </div>

      <h1 style={{ marginBottom: 8 }}>Edit Ad</h1>

      {loading && <div>Loading ad...</div>}

      {error && !loading && (
        <div
          style={{
            color: "#b00020",
            background: "#fff5f5",
            border: "1px solid #f0c7c7",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {!loading && ad && (
        <AdForm
          businesses={businesses}
          onSubmit={handleSubmit}
          submitting={saving}
          mode="edit"
          hideCampaign
          initialValues={{
            businessId: ad.businessId,
            title: ad.title,
            headline: ad.headline ?? "",
            description: ad.description ?? "",
            imageUrl: ad.imageUrl ?? "",
            destinationUrl: ad.destinationUrl,
            status: ad.status,
          }}
        />
      )}
    </main>
  );
}