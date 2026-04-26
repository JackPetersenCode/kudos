"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getNotifications,
  markNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  Notification,
  NotificationPreferences,
} from "@/lib/features";
import RequireAuth from "@/components/RequireAuth";

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailOnNewReview: true,
    emailOnReviewResponse: true,
    emailOnNewKudos: true,
    emailOnFavoriteActivity: false,
  });
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [notifData, prefsData] = await Promise.all([
          getNotifications(),
          getNotificationPreferences(),
        ]);
        setNotifications(notifData);
        setPrefs(prefsData);

        // Mark all as read when viewing
        await markNotificationsRead();
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSavePrefs() {
    setSavingPrefs(true);
    try {
      await updateNotificationPreferences(prefs);
    } catch {
      // ignore
    } finally {
      setSavingPrefs(false);
    }
  }

  if (loading) return <main style={{ minHeight: "100vh" }} />;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard">← Back to dashboard</Link>
      </div>

      <h1>Notifications</h1>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 20,
          marginBottom: 32,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Email Preferences</h2>

        <div style={{ display: "grid", gap: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={prefs.emailOnNewReview}
              onChange={(e) => setPrefs({ ...prefs, emailOnNewReview: e.target.checked })}
            />{" "}
            Email me when my business gets a new review
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.emailOnReviewResponse}
              onChange={(e) => setPrefs({ ...prefs, emailOnReviewResponse: e.target.checked })}
            />{" "}
            Email me when a business responds to my review
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.emailOnNewKudos}
              onChange={(e) => setPrefs({ ...prefs, emailOnNewKudos: e.target.checked })}
            />{" "}
            Email me when a staff member receives a review
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.emailOnFavoriteActivity}
              onChange={(e) => setPrefs({ ...prefs, emailOnFavoriteActivity: e.target.checked })}
            />{" "}
            Email me about activity on saved businesses
          </label>
        </div>

        <button
          onClick={handleSavePrefs}
          disabled={savingPrefs}
          style={{ marginTop: 16 }}
        >
          {savingPrefs ? "Saving..." : "Save Preferences"}
        </button>
      </section>

      <section>
        <h2>Recent Notifications</h2>

        {notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 14,
                  background: notif.isRead ? "#fff" : "#f5f0ff",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{notif.subject}</div>
                <div style={{ color: "#555" }}>{notif.body}</div>
                <small style={{ color: "#888" }}>
                  {new Date(notif.createdAtUtc).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsContent />
    </RequireAuth>
  );
}
