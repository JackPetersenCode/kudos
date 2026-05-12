import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA Policy — Reputater",
};

export default function DMCAPage() {
  return (
    <main className="page-container-medium" style={{ lineHeight: 1.8 }}>
      <h1>DMCA Copyright Policy</h1>
      <p style={{ color: "var(--color-text-secondary)" }}>Last updated: April 24, 2026</p>

      <section>
        <h2>Reporting Copyright Infringement</h2>
        <p>
          Mama Dog LLC (&quot;Reputater&quot;) respects the intellectual property rights of others
          and expects our users to do the same. In accordance with the Digital Millennium Copyright Act of 1998
          (&quot;DMCA&quot;), we will respond promptly to claims of copyright infringement committed using our Service.
        </p>
      </section>

      <section>
        <h2>Filing a DMCA Notice</h2>
        <p>If you believe that content on Reputater infringes your copyright, please send a written notice containing:</p>
        <ol>
          <li>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf</li>
          <li>Identification of the copyrighted work claimed to have been infringed</li>
          <li>Identification of the material that is claimed to be infringing, including the URL where it appears on our Service</li>
          <li>Your contact information: name, address, telephone number, and email address</li>
          <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law</li>
          <li>A statement, made under penalty of perjury, that the information in the notification is accurate, and that you are authorized to act on behalf of the copyright owner</li>
        </ol>
      </section>

      <section>
        <h2>Designated Agent</h2>
        <p>
          Send DMCA notices to our designated agent:<br /><br />
          Mama Dog LLC<br />
          Attn: DMCA Agent<br />
          Email: <strong>dmca@reputater.com</strong>
        </p>
      </section>

      <section>
        <h2>Counter-Notification</h2>
        <p>
          If you believe your content was removed or disabled by mistake or misidentification, you may submit a
          counter-notification containing:
        </p>
        <ol>
          <li>Your physical or electronic signature</li>
          <li>Identification of the material that has been removed and the location where it previously appeared</li>
          <li>A statement under penalty of perjury that you have a good faith belief the material was removed as a result of mistake or misidentification</li>
          <li>Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the federal court in Travis County, Texas</li>
        </ol>
      </section>

      <section>
        <h2>Repeat Infringers</h2>
        <p>
          In accordance with the DMCA, we will terminate, in appropriate circumstances, the accounts of users
          who are repeat infringers of copyright.
        </p>
      </section>
    </main>
  );
}
