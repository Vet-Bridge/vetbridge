import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | MyPawLink",
  description: "Contact MyPawLink support.",
};

export default function ContactPage() {
  return (
    <main className="legal-page">
      <section className="legal-card" aria-labelledby="contact-title">
        <p className="legal-kicker">MyPawLink</p>
        <h1 id="contact-title">Contact</h1>
        <p className="legal-updated">Company and support information</p>

        <address className="legal-address">
          MyPawLink
          <br />
          Roswell, Georgia
          <br />
          <a href="mailto:support@mypawlink.com">support@mypawlink.com</a>
        </address>
      </section>
    </main>
  );
}
