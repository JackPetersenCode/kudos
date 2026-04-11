"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function NavBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");

  useEffect(() => {
    setWhat(searchParams.get("q") ?? "");
    setWhere(searchParams.get("where") ?? "");
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const params = new URLSearchParams();

    if (what.trim()) params.set("q", what.trim());
    if (where.trim()) params.set("where", where.trim());

    router.push(`/search?${params.toString()}`);
  }

  return (
    <nav
      style={{
        borderBottom: "1px solid #ddd",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "inherit",
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          Kudos
        </Link>

        <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}>
          Dashboard
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: 8,
          flex: 1,
          maxWidth: 800,
          minWidth: 320,
        }}
      >
        <input
          type="text"
          placeholder="What (business, category, keyword)"
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        />

        <input
          type="text"
          placeholder="Where (city or state)"
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        />

        <button
          type="submit"
          style={{
            padding: "10px 16px",
            border: "1px solid #ccc",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>
    </nav>
  );
}