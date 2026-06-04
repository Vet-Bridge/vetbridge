import Link from "next/link";

export default function LegalFooter() {
  return (
    <footer className="legal-footer" aria-label="MyPawLink legal and support information">
      <div className="legal-footer__inner">
        <nav className="legal-footer__links" aria-label="Legal and support links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/security">Security</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <p className="legal-footer__meta">
          MyPawLink is a communication, consent, document, and update platform.
        </p>
      </div>
    </footer>
  );
}
