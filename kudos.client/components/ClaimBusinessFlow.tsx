"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Props = {
  businessId: string;
  onClaimed: () => void;
};

type InitiateResult = {
  status: "approved" | "verification_required";
  method?: string;
  message: string;
  availableMethods?: string[];
  businessWebsite?: string | null;
  businessPhone?: string | null;
};

// SMS (phone) claim verification is disabled while Twilio A2P is deferred.
// Flip to true to restore the SMS option once the A2P campaign is live.
const SMS_ENABLED = false;

export default function ClaimBusinessFlow({ businessId, onClaimed }: Props) {
  const [step, setStep] = useState<"idle" | "loading" | "choose" | "email" | "sms" | "manual" | "verify" | "done" | "error">("idle");
  const [methods, setMethods] = useState<string[]>([]);
  const [bizWebsite, setBizWebsite] = useState<string | null>(null);
  const [bizPhone, setBizPhone] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [code, setCode] = useState("");
  const [claimId, setClaimId] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function handleInitiate() {
    setStep("loading");
    setError("");

    try {
      const res = await apiFetch(`/public/business/${businessId}/claim/initiate`, { method: "POST" });
      const data: InitiateResult = await res.json();

      if (data.status === "approved") {
        setMessage(data.message);
        setStep("done");
        onClaimed();
        return;
      }

      setMethods(data.availableMethods ?? ["manual"]);
      setBizWebsite(data.businessWebsite ?? null);
      setBizPhone(data.businessPhone ?? null);

      // Pre-fill email domain hint
      if (data.businessWebsite) {
        try {
          const url = data.businessWebsite.startsWith("http") ? data.businessWebsite : `https://${data.businessWebsite}`;
          let host = new URL(url).hostname;
          if (host.startsWith("www.")) host = host.slice(4);
          setVerificationEmail(`@${host}`);
        } catch {
          // ignore
        }
      }

      setStep("choose");
    } catch (err) {
      const errorObj = err as Error & { data?: { message?: string; reason?: string } };
      setError(errorObj.data?.message ?? errorObj.message ?? "Could not initiate claim.");
      setStep("error");
    }
  }

  async function handleSendEmailCode() {
    if (!verificationEmail.trim() || !verificationEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await apiFetch(`/public/business/${businessId}/claim/send-email-code`, {
        method: "POST",
        body: JSON.stringify({ verificationEmail }),
      });
      const data = await res.json();
      setClaimId(data.claimId);
      setMessage(data.message);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setSending(false);
    }
  }

  async function handleSendSmsCode() {
    setSending(true);
    setError("");

    try {
      const res = await apiFetch(`/public/business/${businessId}/claim/send-sms-code`, { method: "POST" });
      const data = await res.json();
      setClaimId(data.claimId);
      setMessage(data.message);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send SMS.");
    } finally {
      setSending(false);
    }
  }

  async function handleManualSubmit() {
    setSending(true);
    setError("");

    try {
      await apiFetch(`/public/business/${businessId}/claim/manual`, {
        method: "POST",
        body: JSON.stringify({ verificationNote: manualNote }),
      });
      setMessage("Your claim has been submitted for manual review. You'll be notified when it's resolved.");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit claim.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyCode() {
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await apiFetch(`/public/business/${businessId}/claim/verify-code`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setMessage(data.message);
      setStep("done");
      onClaimed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setSending(false);
    }
  }

  if (step === "idle") {
    return (
      <button onClick={handleInitiate} className="btn-ghost" style={{ fontSize: 13 }}>
        Claim this business
      </button>
    );
  }

  if (step === "loading") {
    return <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Checking eligibility...</span>;
  }

  if (step === "done") {
    return (
      <div className="success-message" style={{ marginTop: 12 }}>
        {message}
      </div>
    );
  }

  if (step === "error") {
    return (
      <div style={{ marginTop: 12 }}>
        <div className="error-message">{error}</div>
        <button onClick={() => setStep("idle")} className="btn-ghost" style={{ marginTop: 8, fontSize: 13 }}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="section-card" style={{ marginTop: 12 }}>
      {/* Choose method */}
      {step === "choose" && (
        <>
          <h3 style={{ marginTop: 0 }}>Verify You Own This Business</h3>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
            Choose how you&apos;d like to verify your ownership.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {methods.includes("email") && (
              <button onClick={() => setStep("email")} className="btn-outline" style={{ textAlign: "left", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>Email Verification</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-accent)", background: "var(--color-accent-soft, rgba(233,69,96,0.1))", padding: "2px 8px", borderRadius: 999 }}>Recommended</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  We&apos;ll send a code to an email at {bizWebsite ? new URL(bizWebsite.startsWith("http") ? bizWebsite : `https://${bizWebsite}`).hostname.replace("www.", "") : "the business domain"}
                </div>
              </button>
            )}

            {SMS_ENABLED && methods.includes("sms") && (
              <button onClick={() => setStep("sms")} className="btn-outline" style={{ textAlign: "left", padding: 16 }}>
                <div style={{ fontWeight: 700 }}>Phone Verification</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  We&apos;ll text a code to {bizPhone ?? "the business phone number"}
                </div>
              </button>
            )}

            {methods.includes("manual") && (
              <button onClick={() => setStep("manual")} className="btn-outline" style={{ textAlign: "left", padding: 16 }}>
                <div style={{ fontWeight: 700 }}>Manual Review</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  Submit documentation for an admin to review (takes 1-3 business days)
                </div>
              </button>
            )}
          </div>
        </>
      )}

      {/* Email input */}
      {step === "email" && (
        <>
          <h3 style={{ marginTop: 0 }}>Email Verification</h3>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
            Enter your email address at the business domain. We&apos;ll send a 6-digit verification code.
          </p>

          <input
            type="email"
            value={verificationEmail}
            onChange={(e) => setVerificationEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            style={{ marginBottom: 12 }}
          />

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSendEmailCode} disabled={sending} className="btn-accent">
              {sending ? "Sending..." : "Send Code"}
            </button>
            <button onClick={() => setStep("choose")} className="btn-ghost">Back</button>
          </div>
        </>
      )}

      {/* SMS consent + send */}
      {step === "sms" && (
        <>
          <h3 style={{ marginTop: 0 }}>Phone Verification</h3>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
            We&apos;ll text a one-time 6-digit verification code to{" "}
            <strong>{bizPhone ?? "the business phone number on file"}</strong>.
          </p>

          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
              lineHeight: 1.6,
            }}
          >
            By tapping <strong>Send Code</strong>, you consent to receive a one-time SMS
            verification code at this number. One message is sent per claim attempt.
            Message and data rates may apply. Reply <strong>STOP</strong> to opt out or{" "}
            <strong>HELP</strong> for help. See our{" "}
            <a href="/sms-consent" target="_blank" rel="noopener noreferrer">SMS Terms</a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSendSmsCode} disabled={sending} className="btn-accent">
              {sending ? "Sending..." : "Send Code"}
            </button>
            <button onClick={() => setStep("choose")} className="btn-ghost">Back</button>
          </div>
        </>
      )}

      {/* Manual review */}
      {step === "manual" && (
        <>
          <h3 style={{ marginTop: 0 }}>Manual Review</h3>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
            Tell us how you&apos;re associated with this business. An admin will review your claim.
          </p>

          <textarea
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            placeholder="E.g., I'm the owner. You can verify by calling the business at..."
            style={{ minHeight: 80, marginBottom: 12 }}
          />

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleManualSubmit} disabled={sending} className="btn-accent">
              {sending ? "Submitting..." : "Submit for Review"}
            </button>
            <button onClick={() => setStep("choose")} className="btn-ghost">Back</button>
          </div>
        </>
      )}

      {/* Verify code */}
      {step === "verify" && (
        <>
          <h3 style={{ marginTop: 0 }}>Enter Verification Code</h3>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
            {message}
          </p>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            inputMode="numeric"
            maxLength={6}
            style={{ marginBottom: 12, fontSize: 24, letterSpacing: "0.3em", textAlign: "center", maxWidth: 200 }}
          />

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleVerifyCode} disabled={sending || code.length !== 6} className="btn-accent">
              {sending ? "Verifying..." : "Verify"}
            </button>
            <button onClick={() => setStep("choose")} className="btn-ghost">Back</button>
          </div>
        </>
      )}

      {error && <div className="error-message" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
