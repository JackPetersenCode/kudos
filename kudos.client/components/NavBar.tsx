"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";

export default function NavBar() {
  const router = useRouter();
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const params = new URLSearchParams();
    if (what.trim()) params.set("q", what.trim());
    if (where.trim()) params.set("where", where.trim());

    router.push(`/search?${params.toString()}`);
  }

  return (
    <header
      style={{
        borderBottom: "1px solid #e5e5e5",
        background: "#fff",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "14px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: "#111",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Kudos
          </Link>

          <form
            onSubmit={handleSearch}
            style={{
              flex: "1 1 560px",
              minWidth: 280,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              placeholder="What"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              style={{
                width: "100%",
                minWidth: 0,
                padding: "11px 12px",
                borderRadius: 10,
                border: "1px solid #d0d0d0",
                boxSizing: "border-box",
              }}
            />

            <input
              placeholder="Where"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              style={{
                width: "100%",
                minWidth: 0,
                padding: "11px 12px",
                borderRadius: 10,
                border: "1px solid #d0d0d0",
                boxSizing: "border-box",
              }}
            />

            <button
              type="submit"
              style={{
                padding: "11px 16px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Search
            </button>
          </form>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <CategoryMegaMenu />

            <Link
              href="/map"
              style={{
                textDecoration: "none",
                color: "#111",
                fontWeight: 600,
                padding: "10px 12px",
                whiteSpace: "nowrap",
              }}
            >
              Map
            </Link>

            <Link
              href="/dashboard"
              style={{
                textDecoration: "none",
                color: "#111",
                fontWeight: 600,
                padding: "10px 12px",
                whiteSpace: "nowrap",
              }}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          form {
            grid-template-columns: 1fr 1fr auto !important;
            width: 100%;
          }
        }

        @media (max-width: 680px) {
          form {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </header>
  );
}