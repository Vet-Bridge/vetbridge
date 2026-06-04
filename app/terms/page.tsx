import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | MyPawLink",
  description: "Terms for using MyPawLink veterinary communication tools.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <section className="legal-card" aria-labelledby="terms-title">
        <p className="legal-kicker">MyPawLink</p>
        <h1 id="terms-title">Terms of Service</h1>
        <p className="legal-updated">Last updated: June 4, 2026</p>

        <h2>Communication Platform</h2>
        <p>
          MyPawLink is a communication and document-sharing platform for veterinary check-in,
          forms, consents, documents, visit updates, and owner communication. MyPawLink is not a
          veterinary medical provider and does not provide veterinary medical advice, diagnosis, or
          treatment.
        </p>

        <h2>Emergency Care</h2>
        <p>
          MyPawLink does not replace emergency veterinary care. If your pet has an urgent medical
          issue, contact your veterinary clinic or the nearest emergency veterinary hospital
          directly.
        </p>

        <h2>Clinic Responsibility</h2>
        <p>
          Veterinary clinics remain responsible for medical decisions, treatment plans, estimates,
          patient care, and the medical accuracy of information they send through MyPawLink.
        </p>

        <h2>Notifications And Availability</h2>
        <p>
          MyPawLink is not liable for delayed notifications or delayed owner responses caused by
          clinic internet outages, third-party system issues, SMS or email delivery problems,
          mobile carrier delays, or integration downtime. Users should contact the clinic directly
          for urgent medical issues.
        </p>
      </section>
    </main>
  );
}
