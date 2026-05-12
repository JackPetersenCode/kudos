import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NavBar from "@/components/NavBar";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Reputater",
  description: "Discover and celebrate great local businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `html,body{background:#fafbfc}` }} />
      </head>
      <body>
        <ToastProvider>
          <NavBar />
          {children}
          <footer style={{
            borderTop: "1px solid var(--color-border)",
            padding: "32px 24px",
            marginTop: 60,
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontSize: 13,
          }}>
            <div style={{ maxWidth: 1240, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginBottom: 12 }}>
                <a href="/privacy" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Privacy Policy</a>
                <a href="/terms" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Terms of Service</a>
                <a href="/dmca" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>DMCA</a>
                <a href="/do-not-sell" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Do Not Sell My Info</a>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8 }}>
                Some business data © <a href="https://www.openstreetmap.org/copyright" style={{ color: "var(--color-text-muted)" }}>OpenStreetMap</a> contributors, available under the <a href="https://opendatacommons.org/licenses/odbl/" style={{ color: "var(--color-text-muted)" }}>ODbL</a>.
              </div>
              <div>© {new Date().getFullYear()} Mama Dog LLC. All rights reserved.</div>
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
