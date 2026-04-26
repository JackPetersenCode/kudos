"use client";

import { useState } from "react";

type Props = {
  url: string;
  title: string;
};

export default function ShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${url}`
    : url;

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>Share:</span>

      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="toggle-btn"
        style={{ padding: "5px 12px", fontSize: 13, textDecoration: "none" }}
      >
        X / Twitter
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="toggle-btn"
        style={{ padding: "5px 12px", fontSize: 13, textDecoration: "none" }}
      >
        Facebook
      </a>

      <a
        href={`mailto:?subject=${encodedTitle}&body=Check out ${encodedTitle} on Reputater: ${encodedUrl}`}
        className="toggle-btn"
        style={{ padding: "5px 12px", fontSize: 13, textDecoration: "none" }}
      >
        Email
      </a>

      <button
        onClick={handleCopy}
        className="toggle-btn"
        style={{ padding: "5px 12px", fontSize: 13 }}
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
