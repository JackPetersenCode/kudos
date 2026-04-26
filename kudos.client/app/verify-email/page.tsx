"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReputaterLogo from "@/components/ReputaterLogo";
import { apiFetch } from "@/lib/api";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    async function verify() {
      try {
        const res = await apiFetch("/Auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        setStatus("success");
        setMessage(data.message ?? "Email verified!");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed.");
      }
    }

    verify();
  }, [token]);

  return (
    <main className="page-container-narrow" style={{ paddingTop: 60, textAlign: "center" }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <ReputaterLogo size={36} />
      </Link>

      <div className="section-card" style={{ padding: 32, marginTop: 32 }}>
        {status === "loading" && <p>Verifying your email...</p>}
        {status === "success" && (
          <>
            <h2 style={{ color: "var(--color-success)" }}>Email Verified</h2>
            <p>{message}</p>
            <Link href="/dashboard" className="btn-accent" style={{ textDecoration: "none", display: "inline-block", marginTop: 16 }}>
              Go to Dashboard
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h2 style={{ color: "var(--color-danger)" }}>Verification Failed</h2>
            <p>{message}</p>
            <Link href="/login" style={{ fontWeight: 600 }}>Back to login</Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="page-container-narrow" style={{ paddingTop: 60 }}>Loading...</main>}>
      <VerifyContent />
    </Suspense>
  );
}
