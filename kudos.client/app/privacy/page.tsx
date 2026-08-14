import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Reputater",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="page-container-medium" style={{ lineHeight: 1.8 }}>
      <h1>Privacy Policy</h1>
      <p style={{ color: "var(--color-text-secondary)" }}>Last updated: April 30, 2026</p>
      <p style={{ color: "var(--color-text-secondary)" }}>Operated by Mama Dog LLC</p>

      <section>
        <h2>1. Information We Collect</h2>
        <h3>Information You Provide</h3>
        <ul>
          <li><strong>Account information:</strong> Email address, password (stored as a one-way cryptographic hash), display name</li>
          <li><strong>Profile information:</strong> Profile photo</li>
          <li><strong>User content:</strong> Reviews, photos, staff kudos, and tags you submit</li>
          <li><strong>Business information:</strong> If you add or claim a business, we collect business details including name, address, phone, website, hours, and photos</li>
          <li><strong>Payment information:</strong> Processed securely by Stripe, Inc. We do not store your credit card number, CVV, or full card details on our servers</li>
          <li><strong>Communications:</strong> Information you provide when you contact us for support</li>
        </ul>

        <h3>Information Collected Automatically</h3>
        <ul>
          <li><strong>Device and usage data:</strong> IP address, browser type, operating system, referring URLs, pages visited, and timestamps</li>
          <li><strong>Location data:</strong> With your permission, we collect approximate geographic coordinates from your browser to show nearby businesses. You can deny or revoke this permission at any time through your browser settings</li>
          <li><strong>Ad interaction data:</strong> Impressions, clicks, placement, and page path for advertisements</li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide, maintain, and improve the Service</li>
          <li>To display reviews, business information, and staff kudos publicly</li>
          <li>To process advertising purchases and payments</li>
          <li>To send verification codes for business claims via email or SMS</li>
          <li>To send notifications about your account activity (configurable in your notification preferences)</li>
          <li>To moderate content using automated tools, including AI-based sentiment analysis for reviews and content review for advertisements</li>
          <li>To detect, prevent, and address fraud, abuse, and security issues</li>
          <li>To comply with legal obligations</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Share Your Information</h2>
        <p><strong>We do not sell your personal information.</strong></p>
        <p>We share information with the following categories of service providers who process data on our behalf:</p>
        <ul>
          <li><strong>Stripe, Inc.</strong> — Payment processing</li>
          <li><strong>Twilio, Inc.</strong> — SMS verification codes</li>
          <li><strong>OpenAI</strong> — Content moderation (review text and ad content are analyzed; no personal identifiers are sent)</li>
          <li><strong>Cloudflare, Inc.</strong> — Image storage and content delivery</li>
        </ul>
        <p>We may also disclose information if required by law, regulation, legal process, or governmental request, or to protect the rights, property, or safety of our company, our users, or the public.</p>
        <p><strong>Public information:</strong> Your display name, reviews, photos, staff kudos, check-ins, and badges are publicly visible on the Service.</p>
      </section>

      <section>
        <h2>4. SMS Communications</h2>
        <p>
          If you provide a business phone number when claiming a business listing on Reputater, you may choose
          to receive a one-time SMS verification code at that number to confirm ownership. By tapping
          &quot;Send Code&quot; on the SMS verification step, you affirmatively consent to receive that one-time message.
        </p>
        <ul>
          <li>
            <strong>Message frequency:</strong> Reputater sends a maximum of one SMS verification code per claim attempt.
            Codes expire 10 minutes after they are sent. We do not send marketing or recurring messages.
          </li>
          <li>
            <strong>Message and data rates:</strong> Message and data rates may apply. Standard carrier messaging
            and data rates apply to messages sent to your mobile number.
          </li>
          <li>
            <strong>Mobile information sharing:</strong>{" "}
            <strong>Mobile information and messaging consent are not shared with third parties or affiliates for
            marketing or promotional purposes.</strong> No mobile information — including your phone number and your
            SMS opt-in — is sold, rented, or shared with any third parties or affiliates for their own marketing or
            promotional purposes. Phone numbers are transmitted only to Twilio, Inc., our SMS service provider, solely
            to deliver the verification code you requested.
          </li>
          <li>
            <strong>Opt-out:</strong> You may opt out at any time by replying <strong>STOP</strong> to any verification
            message. After replying STOP you will not receive further SMS from Reputater.
          </li>
          <li>
            <strong>Help:</strong> Reply <strong>HELP</strong> to any message for support information, or email
            <strong> support@reputater.com</strong>.
          </li>
          <li>
            Carriers are not liable for delayed or undelivered messages.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Data Retention</h2>
        <p>We retain your account information and content for as long as your account is active. After account deletion:</p>
        <ul>
          <li>Personal identifiers (email, display name) are removed within 30 days</li>
          <li>Reviews and photos may be retained in anonymized form</li>
          <li>Payment records are retained as required by tax and financial regulations</li>
          <li>Server logs are retained for up to 90 days</li>
        </ul>
      </section>

      <section>
        <h2>6. Your Rights</h2>
        <h3>All Users</h3>
        <ul>
          <li>Update your display name and profile photo at any time</li>
          <li>Edit or delete your reviews</li>
          <li>Configure your notification preferences</li>
          <li>Request deletion of your account and personal data by contacting us at privacy@reputater.com</li>
        </ul>

        <h3>California Residents (CCPA)</h3>
        <p>If you are a California resident, you have the following additional rights under the California Consumer Privacy Act (CCPA):</p>
        <ul>
          <li><strong>Right to Know:</strong> You may request that we disclose the categories and specific pieces of personal information we have collected about you</li>
          <li><strong>Right to Delete:</strong> You may request that we delete your personal information, subject to certain exceptions</li>
          <li><strong>Right to Opt-Out of Sale:</strong> We do not sell personal information. No opt-out is necessary</li>
          <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights</li>
        </ul>
        <p>To exercise these rights, contact us at <strong>privacy@reputater.com</strong> or use the &quot;Do Not Sell or Share My Personal Information&quot; link in our footer.</p>

        <h3>European Residents (GDPR)</h3>
        <p>If you are located in the European Economic Area (EEA) or United Kingdom, you have additional rights under the General Data Protection Regulation (GDPR):</p>
        <ul>
          <li><strong>Legal basis for processing:</strong> We process your data based on (a) your consent (account creation, location access), (b) performance of a contract (providing the Service), and (c) legitimate interests (security, fraud prevention)</li>
          <li><strong>Right to access:</strong> You may request a copy of your personal data</li>
          <li><strong>Right to rectification:</strong> You may request correction of inaccurate data</li>
          <li><strong>Right to erasure:</strong> You may request deletion of your data (&quot;right to be forgotten&quot;)</li>
          <li><strong>Right to restrict processing:</strong> You may request that we limit how we use your data</li>
          <li><strong>Right to data portability:</strong> You may request your data in a structured, machine-readable format</li>
          <li><strong>Right to object:</strong> You may object to processing based on legitimate interests</li>
          <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time</li>
        </ul>
        <p>To exercise these rights, contact us at <strong>privacy@reputater.com</strong>. We will respond within 30 days.</p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>We implement industry-standard security measures including:</p>
        <ul>
          <li>Passwords stored using BCrypt one-way hashing</li>
          <li>JWT-based authentication with signed tokens</li>
          <li>HTTPS encryption for all data in transit</li>
          <li>Secure payment processing through Stripe (PCI DSS compliant)</li>
          <li>Rate limiting on API endpoints to prevent abuse</li>
        </ul>
        <p>No method of transmission over the Internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.</p>
      </section>

      <section>
        <h2>8. Cookies and Local Storage</h2>
        <p>We use browser localStorage to store your authentication token. We do not use tracking cookies, advertising cookies, or third-party analytics cookies.</p>
        <p>Third-party services embedded in the Service (such as OpenStreetMap map tiles) may set their own cookies. Please refer to their respective privacy policies for details.</p>
      </section>

      <section>
        <h2>9. Children&apos;s Privacy</h2>
        <p>The Service is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information promptly.</p>
      </section>

      <section>
        <h2>10. International Data Transfers</h2>
        <p>Your information may be transferred to and processed in the United States, where our servers are located. By using the Service, you consent to the transfer of your information to the United States and acknowledge that data protection laws in the United States may differ from those in your country.</p>
      </section>

      <section>
        <h2>11. Third-Party Data Sources</h2>
        <p>Some business listing data is sourced from OpenStreetMap, which is made available under the Open Database License (ODbL). This data is &copy; OpenStreetMap contributors.</p>
      </section>

      <section>
        <h2>12. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify users of material changes by posting the revised policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after the effective date constitutes your acceptance of the revised policy.</p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>For privacy-related questions or to exercise your rights, contact:</p>
        <p>
          Mama Dog LLC<br />
          Email: privacy@reputater.com
        </p>
      </section>
    </main>
  );
}
