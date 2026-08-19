"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import ReputaterLogo from "@/components/ReputaterLogo";
import { getUnreadNotificationCount } from "@/lib/features";

export default function NavBar() {
  const router = useRouter();
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    function syncAuth() {
      // Signed-in state comes from the non-sensitive userEmail marker; the JWT
      // itself is an httpOnly cookie JS can't read.
      const loggedIn = !!localStorage.getItem("userEmail");
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        getUnreadNotificationCount()
          .then((data) => setUnreadCount(data.unreadCount))
          .catch(() => {});
      } else {
        setUnreadCount(0);
      }
    }

    syncAuth();
    window.addEventListener("auth-changed", syncAuth);
    return () => window.removeEventListener("auth-changed", syncAuth);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (what.trim()) params.set("q", what.trim());
    // Empty or "Current Location" => no `where` param, so the search falls back
    // to the browser's geolocation ("near you").
    const loc = where.trim();
    if (loc && loc.toLowerCase() !== "current location") params.set("where", loc);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          <ReputaterLogo size={34} />
        </Link>

        <form onSubmit={handleSearch} className="navbar-search">
          <div className="navbar-search-inputs">
            <SearchAutocomplete
              value={what}
              onChange={setWhat}
              placeholder="Search businesses..."
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              }
            />
            <div className="search-divider" />
            <LocationAutocomplete
              value={where}
              onChange={setWhere}
              onUseCurrentLocation={() => setWhere("Current Location")}
              onSelectCity={(city) => setWhere(city)}
              placeholder="City, state, or zip"
            />
          </div>
          <button type="submit" className="search-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </form>

        <nav className="navbar-nav">
          <Link href="/write-review" className="nav-link">
            <div className="flex-container">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              <div className="pad-left">Write a Review</div>
            </div>
          </Link>

          <Link href="/leaderboard" className="nav-link">
            <div className="flex-container">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" />
              </svg>
              <div className="pad-left">Leaderboard</div>
            </div>
          </Link>

          {/* Always render the notification + account links to avoid layout shift.
              The bell is hidden via CSS when logged out; the account icon always shows
              and just changes its href. No conditional mounting = no pop-in. */}
          <Link
            href="/dashboard/notifications"
            className="nav-link"
            style={{ display: isLoggedIn ? undefined : "none" }}
          >
            <div className="flex-container nav-notif">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
              {unreadCount > 0 && (
                <span className="notif-badge">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </Link>

          <Link href={isLoggedIn ? "/dashboard" : "/login"} className="nav-link">
            <div className="flex-container">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              {!isLoggedIn && <div className="pad-left">Sign in</div>}
            </div>
          </Link>
        </nav>
      </div>

      <div className="navbar-categories">
        <CategoryMegaMenu />
      </div>

    </header>
  );
}
