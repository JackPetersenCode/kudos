//"use client";
//
//import { useEffect, useState } from "react";
//import { useRouter } from "next/navigation";
//import { logout } from "@/lib/auth";
//import { getProfile, getAccessibleBusinesses, AccessibleBusiness, ProfileResponse } from "@/lib/profile";
//
//export default function DashboardPage() {
//  const [profile, setProfile] = useState<ProfileResponse | null>(null);
//  const [businesses, setBusinesses] = useState<AccessibleBusiness[]>([]);
//  const [error, setError] = useState("");
//  const router = useRouter();
//
//  useEffect(() => {
//    async function loadData() {
//      try {
//        const me = await getProfile();
//        setProfile(me);
//
//        const owned = await getAccessibleBusinesses();
//        setBusinesses(owned);
//      } catch (err) {
//        setError(err instanceof Error ? err.message : "Unauthorized");
//        router.push("/login");
//      }
//    }
//
//    loadData();
//  }, [router]);
//
//  if (!profile) {
//    return <main style={{ padding: 24 }}>Loading...</main>;
//  }
//
//  return (
//    <main style={{ padding: 24 }}>
//      <h1>Dashboard</h1>
//
//      <p><strong>Email:</strong> {profile.email}</p>
//      <p><strong>Role:</strong> {profile.role}</p>
//
//      <h2>Your Businesses</h2>
//
//      {businesses.length === 0 ? (
//        <p>You do not own any businesses yet.</p>
//      ) : (
//        <ul>
//          {businesses.map((business) => (
//            <li key={business.id}>
//              <strong>{business.name}</strong> — {business.city}, {business.state}
//              {business.membershipRole == "owner" ? " (Owner)" : ""}
//            </li>
//          ))}
//        </ul>
//      )}
//
//      <button
//        onClick={() => {
//          logout();
//          router.push("/login");
//        }}
//      >
//        Logout
//      </button>
//    </main>
//  );
//}
"use client";
import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import {
  getProfile,
  getAccessibleBusinesses,
  ProfileResponse,
  AccessibleBusiness,
} from "@/lib/profile";

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [businesses, setBusinesses] = useState<AccessibleBusiness[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const [profileData, businessData] = await Promise.all([
          getProfile(),
          getAccessibleBusinesses(),
        ]);

        setProfile(profileData);
        setBusinesses(businessData);
      } catch {
        router.push("/login");
      }
    }

    loadData();
  }, [router]);

  if (!profile) {
    return <main style={{ padding: 24 }}>Loading...</main>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>

      <p><strong>Email:</strong> {profile.email}</p>
      <p><strong>Role:</strong> {profile.role}</p>

      <h2>Your Businesses</h2>

      <div style={{ marginBottom: 16 }}>
        <Link href="/business/new">Create a new business</Link>
      </div>
      {businesses.length === 0 ? (
        <p>You do not own or manage any businesses yet.</p>
      ) : (
        <ul>
          {businesses.map((business) => (
            <li key={business.id} style={{ marginBottom: 16 }}>
              <Link href={`/dashboard/business/${business.slug}`}>
                <strong>{business.name}</strong>
              </Link> 
              ({business.membershipRole})
              <div>Slug: {business.slug}</div>
              <div>{business.description ?? "No description provided"}</div>
              <div>
                {[business.address1, business.city, business.state, business.postalCode]
                  .filter(Boolean)
                  .join(", ") || "No address provided"}
              </div>
              <div>{business.phone ?? "No phone provided"}</div>
              <div>{business.websiteUrl ?? "No website provided"}</div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => {
          logout();
          router.push("/login");
        }}
      >
        Logout
      </button>
    </main>
  );
}