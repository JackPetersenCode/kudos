//// src/app/page.tsx
//import Link from "next/link";
//
//export default function HomePage() {
//  return (
//    <main style={{ padding: 24 }}>
//      <h1>Kudos</h1>
//      <p>Next.js frontend connected to ASP.NET backend.</p>
//
//      <div style={{ display: "flex", gap: 12 }}>
//        <Link href="/register">Register</Link>
//        <Link href="/login">Login</Link>
//        <Link href="/dashboard">Dashboard</Link>
//      </div>
//    </main>
//  );
//}
import HomeCategoryLinks from "@/components/HomeCategoryLinks";

export default function HomePage() {
  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <section style={{ padding: "32px 0" }}>
        <h1 style={{ fontSize: 40, marginBottom: 12 }}>Discover great local businesses</h1>
        <p style={{ fontSize: 18, color: "#555", maxWidth: 700 }}>
          Search for restaurants, coffee shops, florists, gyms, and more. Browse by category,
          explore on the map, and read reviews from other visitors.
        </p>
      </section>

      <HomeCategoryLinks />
    </main>
  );
}