import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SMS Consent — Reputater",
  description:
    "How users opt in to receive one-time SMS verification codes from Reputater for business claim verification.",
};

export default function SmsConsentPage() {
  return (
    <main className="page-container-medium" style={{ lineHeight: 1.7 }}>
      <h1>SMS Consent &amp; Opt-In</h1>
      <p style={{ color: "var(--color-text-secondary)" }}>
        This page describes when and how Reputater sends SMS messages, the consent flow that
        precedes every message, and how to opt out. It exists as publicly accessible documentation
        of our A2P 10DLC opt-in process.
      </p>

      <section>
        <h2>What SMS does Reputater send?</h2>
        <p>
          Reputater sends one type of SMS message: a <strong>one-time business claim verification code</strong>.
          The message is sent only when a signed-in user explicitly initiates a phone-based business claim
          and taps &quot;Send Code.&quot; We do not send marketing, promotional, or recurring SMS messages.
        </p>
        <p>Sample message body:</p>
        <pre
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            padding: 14,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          Your Reputater business verification code is: 123456
        </pre>
      </section>

      <section>
        <h2>How users opt in</h2>
        <p>
          End users opt in to receive a verification SMS through the business claim flow on Reputater
          (<Link href="/">https://reputater.com</Link>) or in our mobile app. The full opt-in path is:
        </p>
        <ol>
          <li>The user creates an account or signs in to an existing account.</li>
          <li>
            The user navigates to a business listing they wish to claim and taps the
            <strong> &quot;Claim this business&quot;</strong> button.
          </li>
          <li>
            The user is presented with three verification methods:
            <strong> Email Verification</strong>, <strong> Phone Verification</strong>, or
            <strong> Manual Review</strong>. SMS is sent only if the user explicitly chooses Phone Verification.
          </li>
          <li>
            On the Phone Verification step, the user sees the message
            <em> &quot;We&apos;ll text a code to &lt;business phone number on file&gt;&quot;</em>
            along with our message-rate disclosure and a link to this page.
          </li>
          <li>
            The user taps <strong>&quot;Send Code&quot;</strong>. This affirmative tap is the user&apos;s consent to
            receive a one-time SMS verification code at the phone number associated with the business listing.
          </li>
          <li>
            The user receives one SMS containing a 6-digit code valid for 10 minutes. The user enters
            the code to complete the claim.
          </li>
        </ol>
      </section>

      <section>
        <h2>Consent disclosures shown at the point of opt-in</h2>
        <p>The Phone Verification step in our app and on the web includes the following disclosures:</p>
        <ul>
          <li>The phone number to which the code will be sent.</li>
          <li>That one (1) message will be sent.</li>
          <li>
            <strong>Message and data rates may apply.</strong> Standard carrier messaging and data rates apply.
          </li>
          <li>
            Reply <strong>STOP</strong> to opt out at any time, or <strong>HELP</strong> for support.
          </li>
          <li>
            A link to our <Link href="/privacy">Privacy Policy</Link>, which states that mobile phone numbers
            and SMS consent are not shared with or sold to any third parties for marketing or promotional purposes.
          </li>
        </ul>
      </section>

      <section>
        <h2>Message frequency</h2>
        <p>
          One SMS per claim attempt initiated by the user. Codes expire after 10 minutes. Reputater does not
          send recurring or promotional SMS.
        </p>
      </section>

      <section>
        <h2>Opt-out</h2>
        <p>
          Users may opt out at any time by replying <strong>STOP</strong> to a verification message. After
          replying STOP, the user&apos;s number is blocked from receiving further SMS from Reputater. Users may
          also email <strong>support@reputater.com</strong> to request opt-out from any phone number.
        </p>
      </section>

      <section>
        <h2>Data sharing</h2>
        <p>
          <strong>
            Mobile phone numbers and consent to receive SMS are not shared with or sold to any third parties
            for marketing or promotional purposes.
          </strong>{" "}
          Phone numbers are transmitted only to Twilio, Inc., our SMS service provider, solely for the purpose
          of delivering the verification code requested by the user. See our{" "}
          <Link href="/privacy">Privacy Policy</Link> for full details.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          For SMS-related questions or to request opt-out from a number you control:
          <br />
          Email: <strong>support@reputater.com</strong>
        </p>
      </section>
    </main>
  );
}
