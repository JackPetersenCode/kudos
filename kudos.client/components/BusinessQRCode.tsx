"use client";

import { useState } from "react";

type Props = {
  slug: string;
  businessName: string;
};

export default function BusinessQRCode({ slug, businessName }: Props) {
  const [showQR, setShowQR] = useState(false);

  const businessUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/business/${slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(businessUrl)}`;

  return (
    <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #ccc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>QR Code</h2>
        <button onClick={() => setShowQR(!showQR)}>
          {showQR ? "Hide QR Code" : "Show QR Code"}
        </button>
      </div>

      <p style={{ color: "#666" }}>
        Print this QR code and display it at your business so customers can easily leave reviews.
      </p>

      {showQR && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 24,
            textAlign: "center",
            background: "#fff",
            maxWidth: 400,
          }}
        >
          <img
            src={qrUrl}
            alt={`QR code for ${businessName}`}
            style={{ width: 300, height: 300 }}
          />
          <div style={{ marginTop: 12, fontWeight: 700 }}>{businessName}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#666", wordBreak: "break-all" }}>
            {businessUrl}
          </div>
          <div style={{ marginTop: 16 }}>
            <a
              href={qrUrl}
              download={`${slug}-qr-code.png`}
              style={{
                display: "inline-block",
                padding: "10px 20px",
                background: "#111",
                color: "#fff",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Download QR Code
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
