import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | MyPawLink",
  description: "How MyPawLink collects, uses, and protects information for veterinary communication.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-card" aria-labelledby="privacy-title">
        <p className="legal-kicker">MyPawLink</p>
        <h1 id="privacy-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: June 4, 2026</p>

        <p>
          MyPawLink supports communication between veterinary clinics and pet owners during
          check-in, referral, consent, document, and visit update workflows.
        </p>

        <h2>Information We Collect</h2>
        <p>MyPawLink may collect information needed to support a veterinary visit, including:</p>
        <ul className="legal-list">
          <li>Pet owner information such as name, phone number, and email address.</li>
          <li>Pet information and visit details.</li>
          <li>Consent forms, signatures, and submitted forms.</li>
          <li>Uploaded documents and photos related to the visit.</li>
          <li>Visit updates and communication history.</li>
        </ul>

        <h2>How We Use Information</h2>
        <p>
          MyPawLink uses this information only to support veterinary communication between clinics
          and pet owners.
        </p>

        <h2>No Sale Of Data</h2>
        <p>
          MyPawLink does not sell customer, owner, or pet data to third parties.
        </p>

        <h2>Security And Access</h2>
        <p>
          MyPawLink stores information securely and limits access to authorized users who need the
          information to support veterinary communication and related clinic workflows.
        </p>

        <h2>Sharing</h2>
        <p>
          MyPawLink may share information only with the veterinary clinic involved in the visit or
          with authorized service providers needed to operate the platform.
        </p>
      </section>
    </main>
  );
}
