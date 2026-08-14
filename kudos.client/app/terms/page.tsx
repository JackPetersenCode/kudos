import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Reputater",
};

export default function TermsOfServicePage() {
  return (
    <main className="page-container-medium" style={{ lineHeight: 1.8 }}>
      <h1>Terms of Service</h1>
      <p style={{ color: "var(--color-text-secondary)" }}>Last updated: April 24, 2026</p>
      <p style={{ color: "var(--color-text-secondary)" }}>Operated by Mama Dog LLC</p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Reputater (&quot;the Service&quot;), operated by Mama Dog LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to all of these Terms, do not use the Service.</p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <ul>
          <li>You must be at least 13 years of age to use the Service</li>
          <li>If you are under 18, you represent that your legal guardian has reviewed and agreed to these Terms</li>
          <li>You must provide accurate, current, and complete information during registration</li>
          <li>You are responsible for safeguarding your account credentials and for all activity under your account</li>
          <li>One account per person — duplicate or fraudulent accounts may be terminated without notice</li>
        </ul>
      </section>

      <section>
        <h2>3. User-Generated Content</h2>
        <p>Reputater is a positive-only review platform. By submitting content (reviews, photos, staff kudos, business listings), you agree to the following:</p>
        <ul>
          <li>Reviews are subject to automated sentiment analysis. Content determined to be negative in tone will be rejected and not published</li>
          <li>Reviews must be based on genuine first-hand experiences</li>
          <li>You may not post fake, misleading, or incentivized reviews</li>
          <li>You may not post content that is defamatory, obscene, threatening, discriminatory, or that infringes on the intellectual property rights of others</li>
          <li>Photos you upload must be your own original work, or you must have explicit permission from the copyright holder</li>
          <li>You retain ownership of all content you post. By posting, you grant Mama Dog LLC a worldwide, non-exclusive, royalty-free, transferable license to use, display, reproduce, distribute, and create derivative works of your content in connection with the Service</li>
          <li>We reserve the right to remove any content that violates these Terms at our sole discretion</li>
        </ul>
      </section>

      <section>
        <h2>4. Business Listings</h2>
        <ul>
          <li>Business listings may be created by any user or imported from publicly available data sources, including OpenStreetMap (licensed under ODbL)</li>
          <li>Adding a business listing does not confer ownership or management rights</li>
          <li>Business owners may claim their listing through our identity verification process (email domain verification, phone verification, or manual review)</li>
          <li>Falsely claiming a business you do not own or operate is prohibited and may result in account termination</li>
          <li>Verified business owners may edit business information, manage staff profiles, upload photos, and purchase advertising</li>
        </ul>
      </section>

      <section>
        <h2>5. Advertising</h2>
        <ul>
          <li>Advertisements are subject to automated content review by artificial intelligence and may be approved or rejected without manual intervention</li>
          <li>Ad placement uses an auction-based system — the highest bidder for a given placement receives priority</li>
          <li>Payment is processed through Stripe. A payment authorization hold is placed when an ad is submitted. The hold is captured (charged) only if the ad is approved, and released (not charged) if rejected</li>
          <li>Ad budgets serve as spending caps. Ads are automatically removed from rotation when the budget is exhausted</li>
          <li>Advertisements must not contain misleading claims, offensive material, illegal content, or content that violates any applicable law or regulation</li>
          <li>We reserve the right to remove, reject, or pause any advertisement at any time and for any reason</li>
          <li>Refunds for advertising are provided at our sole discretion</li>
        </ul>
      </section>

      <section>
        <h2>6. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Attempt to manipulate reviews, search results, or staff kudos rankings through fraudulent means</li>
          <li>Harass, threaten, or intimidate other users or business owners</li>
          <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
          <li>Scrape, crawl, or use automated means to access the Service without our prior written consent</li>
          <li>Attempt to gain unauthorized access to any portion of the Service, other accounts, or computer systems</li>
          <li>Transmit any viruses, malware, or other harmful code</li>
          <li>Circumvent, disable, or interfere with security-related features of the Service</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity</li>
        </ul>
      </section>

      <section>
        <h2>7. DMCA / Copyright Infringement</h2>
        <p>We respect intellectual property rights. If you believe content on Reputater infringes your copyright, please send a written notice to our designated agent with the following information:</p>
        <ul>
          <li>A description of the copyrighted work you believe has been infringed</li>
          <li>The URL or location of the infringing material on our Service</li>
          <li>Your contact information (name, address, telephone number, email)</li>
          <li>A statement that you have a good faith belief that use of the material is not authorized by the copyright owner</li>
          <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf</li>
          <li>Your physical or electronic signature</li>
        </ul>
        <p>Send DMCA notices to: <strong>legal@reputater.com</strong></p>
        <p>Upon receipt of a valid DMCA notice, we will promptly remove or disable access to the allegedly infringing material and notify the user who posted it. Repeat infringers will have their accounts terminated.</p>
      </section>

      <section>
        <h2>8. Section 230 Notice</h2>
        <p>Reputater is a provider of an interactive computer service within the meaning of Section 230 of the Communications Decency Act (47 U.S.C. § 230). User-generated content on the Service — including reviews, photos, staff kudos, and business listings contributed by users — represents the views and opinions of the individual users who post them, not the views of Mama Dog LLC. We are not the publisher or speaker of user-generated content and are not liable for it.</p>
      </section>

      <section>
        <h2>9. Dispute Resolution and Arbitration</h2>
        <p>Any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved through binding individual arbitration administered by the American Arbitration Association under its Consumer Arbitration Rules, except that either party may bring claims in small claims court if eligible.</p>
        <p><strong>You agree to waive any right to a jury trial and to participate in a class action lawsuit or class-wide arbitration.</strong></p>
        <p>The arbitration shall take place in Travis County, Texas, unless otherwise agreed by the parties. The arbitrator&apos;s decision shall be final and binding.</p>
      </section>

      <section>
        <h2>10. Disclaimer of Warranties</h2>
        <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY DEFECTS WILL BE CORRECTED.</p>
        <p>We do not guarantee the accuracy, completeness, or reliability of any business information, user reviews, staff ratings, hours of operation, or other content displayed on the Service.</p>
      </section>

      <section>
        <h2>11. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MAMA DOG LLC AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE; (B) ANY CONTENT OBTAINED FROM THE SERVICE; (C) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR CONTENT OR TRANSMISSIONS.</p>
        <p>OUR TOTAL LIABILITY FOR ALL CLAIMS RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER OF $100 OR THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
      </section>

      <section>
        <h2>12. Indemnification</h2>
        <p>You agree to defend, indemnify, and hold harmless Mama Dog LLC and its officers, directors, employees, and agents from any claims, damages, obligations, losses, liabilities, costs, or expenses (including attorney&apos;s fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party right, including intellectual property rights; or (d) any content you post on the Service.</p>
      </section>

      <section>
        <h2>13. Termination</h2>
        <p>We may suspend or terminate your account and access to the Service at any time, with or without cause, and with or without notice. Upon termination, your right to use the Service ceases immediately. Sections 7-12 of these Terms shall survive termination.</p>
        <p>You may delete your account at any time by contacting us. Upon account deletion, we will remove your personal information in accordance with our Privacy Policy, though some content (such as reviews) may be retained in anonymized form.</p>
      </section>

      <section>
        <h2>14. Governing Law</h2>
        <p>These Terms shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law provisions. Any legal action not subject to arbitration shall be brought exclusively in the state or federal courts located in Travis County, Texas.</p>
      </section>

      <section>
        <h2>15. Changes to Terms</h2>
        <p>We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the revised Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after the effective date of revised Terms constitutes your acceptance of the changes.</p>
      </section>

      <section>
        <h2>16. SMS/Text Messaging Program Terms</h2>
        <p>These messaging terms govern the SMS messages Reputater sends. By opting in as described below, you agree to them.</p>
        <ul>
          <li><strong>Program description:</strong> Reputater sends transactional, one-time verification codes for the sole purpose of confirming that a user owns or is authorized to manage a business listing. We do not send marketing, promotional, or recurring messages.</li>
          <li><strong>Consent / opt-in:</strong> Messages are sent only when a signed-in user explicitly initiates phone verification in the business claim flow and taps &quot;Send Code.&quot; That affirmative tap is your consent to receive a one-time verification code at the phone number on file for the business. Full opt-in details are documented at <a href="/sms-consent">/sms-consent</a>.</li>
          <li><strong>Message frequency:</strong> One (1) message is sent per claim attempt that you initiate. Codes expire after 10 minutes.</li>
          <li><strong>Cost:</strong> Message and data rates may apply. Standard carrier messaging and data rates apply to messages you receive.</li>
          <li><strong>Opt-out:</strong> Reply <strong>STOP</strong> to any message to opt out and stop receiving further SMS. Reply <strong>HELP</strong> for assistance, or email support@reputater.com.</li>
          <li><strong>Privacy:</strong> Mobile information and messaging consent are not shared with third parties or affiliates for marketing or promotional purposes. No mobile information — including phone numbers and SMS opt-in consent — is sold, rented, or shared with any third parties or affiliates for their own marketing or promotional purposes. Numbers are transmitted only to our SMS provider (Twilio, Inc.) to deliver the code you requested. See our <a href="/privacy">Privacy Policy</a>.</li>
          <li><strong>Carrier disclaimer:</strong> Mobile carriers are not liable for delayed or undelivered messages.</li>
        </ul>
      </section>

      <section>
        <h2>17. Contact</h2>
        <p>For questions about these Terms, contact:</p>
        <p>
          Mama Dog LLC<br />
          Email: legal@reputater.com
        </p>
      </section>
    </main>
  );
}
