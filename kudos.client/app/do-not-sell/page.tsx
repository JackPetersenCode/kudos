import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Do Not Sell My Personal Information — Reputater",
};

export default function DoNotSellPage() {
  return (
    <main className="page-container-medium" style={{ lineHeight: 1.8 }}>
      <h1>Do Not Sell or Share My Personal Information</h1>
      <p style={{ color: "var(--color-text-secondary)" }}>Last updated: April 24, 2026</p>

      <section>
        <h2>We Do Not Sell Your Data</h2>
        <p>
          Mama Dog LLC (&quot;Reputater&quot;) does not sell, rent, or trade your personal
          information to third parties for monetary or other valuable consideration.
        </p>
        <p>
          Under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA),
          &quot;sale&quot; includes sharing personal information with third parties for cross-context behavioral
          advertising. <strong>We do not engage in this practice.</strong>
        </p>
      </section>

      <section>
        <h2>How We Use Your Data</h2>
        <p>
          We only share your personal information with service providers who help us operate the Service
          (payment processing, SMS verification, content moderation, image hosting). These providers are
          contractually prohibited from using your data for their own purposes.
        </p>
        <p>
          For full details on how we collect, use, and share your information, please see our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Your Rights</h2>
        <p>California residents have the right to:</p>
        <ul>
          <li>Request disclosure of the personal information we collect, use, and share</li>
          <li>Request deletion of your personal information</li>
          <li>Not be discriminated against for exercising your privacy rights</li>
        </ul>
        <p>
          To exercise any of these rights, email us at <strong>privacy@reputater.com</strong> with
          the subject line &quot;CCPA Request.&quot; We will verify your identity and respond within 45 days.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Mama Dog LLC<br />
          Email: privacy@reputater.com
        </p>
      </section>
    </main>
  );
}
