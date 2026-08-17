"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import AdForm from "@/components/AdForm";
import { createAd, createAdCampaign, createPaymentHold, confirmPaymentHold, deleteAd } from "@/lib/ads";
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

function CheckoutForm({ campaignId, amount, onSuccess }: {
  campaignId: string;
  amount: number;
  onSuccess: (result: { status: string; reviewDecision: string; reviewReason: string }) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError("");

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Payment failed");
      setProcessing(false);
      return;
    }

    try {
      const result = await confirmPaymentHold(campaignId);
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm payment");
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="section-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Payment</h2>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
          A hold of <strong>${(amount / 100).toFixed(2)}</strong> will be placed on your card.
          You will only be charged if your ad is approved.
          If rejected, the hold is released and you are never charged.
        </p>

        <PaymentElement />
      </div>

      {error && <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="btn-accent"
        style={{ width: "100%", padding: "14px 20px", fontSize: 16 }}
      >
        {processing ? "Processing..." : `Authorize $${(amount / 100).toFixed(2)} and Submit for Review`}
      </button>
    </form>
  );
}

export default function NewAdPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdAdId, setCreatedAdId] = useState<string | null>(null);

  // Payment step state
  const [step, setStep] = useState<"form" | "payment">("form");
  const [clientSecret, setClientSecret] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [budgetAmount, setBudgetAmount] = useState(0);

  // Initialize Stripe lazily on client side only
  const stripePromise = useMemo(() => {
    if (typeof window === "undefined") return null;
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) return null;
    return loadStripe(key);
  }, []);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const res = await apiFetch(`/Profile/business`, { cache: "no-store" });
        const data = await res.json();
        setBusinesses(data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load your businesses");
      } finally {
        setLoading(false);
      }
    }

    loadBusinesses();
  }, []);

  async function handleSubmit(values: AdFormValues) {
    setSaving(true);
    setError("");

    try {
      // Step 1: Create the ad (as draft)
      const ad = await createAd({
        businessId: values.businessId,
        title: values.title,
        headline: values.headline || null,
        description: values.description || null,
        imageUrl: values.imageUrl || null,
        destinationUrl: values.destinationUrl,
        status: "draft",
      });

      setCreatedAdId(ad.id);

      // Step 2: Create the campaign
      const campaign = await createAdCampaign(ad.id, {
        startAtUtc: new Date(values.startAtUtc).toISOString(),
        endAtUtc: new Date(values.endAtUtc).toISOString(),
        budgetCents: Number(values.budgetCents),
        pricingModel: values.pricingModel,
        bidCents: values.bidCents ? Number(values.bidCents) : null,
        placementSlugs: values.placementSlugs,
        categorySlug: values.categorySlug || null,
        city: values.city || null,
        state: values.state || null,
      });

      // Step 3: Create payment hold
      if (stripePromise) {
        const hold = await createPaymentHold(campaign.id);
        setClientSecret(hold.clientSecret);
        setCampaignId(campaign.id);
        setBudgetAmount(hold.amount);
        setStep("payment");
      } else {
        // Stripe not configured — skip payment, just move to pending_review
        await confirmPaymentHold(campaign.id);
        router.push("/dashboard/ads");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create ad");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDraft() {
    if (!createdAdId) return;
    try {
      await deleteAd(createdAdId);
    } catch {
      // ignore
    }
    setStep("form");
    setCreatedAdId(null);
    setClientSecret("");
    setCampaignId("");
    setError("");
  }

  function handlePaymentSuccess(result: { status: string; reviewDecision: string; reviewReason: string }) {
    if (result.reviewDecision === "reject") {
      showToast(`Your ad was not approved.\n\nReason: ${result.reviewReason}\n\nYour payment hold has been released — you were not charged.`, "error");
    } else {
      showToast("Your ad has been approved and is now live!", "success");
    }
    router.push("/dashboard/ads");
  }

  return (
    <main className="page-container" style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Create Ad</h1>
        <div style={{ color: "var(--color-text-secondary)" }}>
          Build a sponsored placement for one of your businesses.
        </div>
      </div>

      {loading && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="skeleton" style={{ height: 200 }} />
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      )}

      {error && !loading && (
        <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {!loading && step === "form" && (
        <AdForm
          businesses={businesses}
          onSubmit={handleSubmit}
          submitting={saving}
        />
      )}

      {step === "payment" && clientSecret && stripePromise && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#e94560",
                borderRadius: "8px",
              },
            },
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div className="success-message">
              Ad and campaign created. Complete payment to submit for review.
            </div>
          </div>

          <CheckoutForm
            campaignId={campaignId}
            amount={budgetAmount}
            onSuccess={handlePaymentSuccess}
          />

          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button onClick={handleDeleteDraft} className="btn-ghost" style={{ color: "var(--color-text-muted)" }}>
              Cancel and delete this ad
            </button>
          </div>
        </Elements>
      )}

      {step === "payment" && !stripePromise && (
        <div className="error-message">
          Stripe is not configured. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local file and restart the dev server.
        </div>
      )}
    </main>
  );
}
