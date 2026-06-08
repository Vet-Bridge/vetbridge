"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CustomerLanguage = "en" | "es";

const customerLanguageStorageKey = "mypawlink-customer-language";
const customerLanguageChangedEvent = "mypawlink-language-change";

const footerCopy = {
  en: {
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    security: "Security",
    contact: "Contact",
    meta: "MyPawLink is a communication, consent, document, and update platform.",
  },
  es: {
    privacy: "Política de privacidad",
    terms: "Términos de servicio",
    security: "Seguridad",
    contact: "Contacto",
    meta: "MyPawLink is a communication, consent, document, and update platform.",
  },
} as const satisfies Record<CustomerLanguage, Record<string, string>>;

const getInitialCustomerLanguage = (): CustomerLanguage => {
  if (typeof window === "undefined") return "en";
  const savedLanguage = window.localStorage.getItem(customerLanguageStorageKey);
  return savedLanguage === "en" || savedLanguage === "es" ? savedLanguage : "en";
};

export default function LegalFooter() {
  const [language, setLanguage] = useState<CustomerLanguage>(getInitialCustomerLanguage);
  const copy = footerCopy[language];

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const languageDetail = (event as CustomEvent<{ language?: CustomerLanguage }>).detail
        ?.language;
      if (languageDetail === "en" || languageDetail === "es") {
        setLanguage(languageDetail);
      }
    };

    window.addEventListener(customerLanguageChangedEvent, handleLanguageChange);
    return () => window.removeEventListener(customerLanguageChangedEvent, handleLanguageChange);
  }, []);

  return (
    <footer className="legal-footer" aria-label="MyPawLink legal and support information">
      <div className="legal-footer__inner">
        <nav className="legal-footer__links" aria-label="Legal and support links">
          <Link href="/privacy">{copy.privacy}</Link>
          <Link href="/terms">{copy.terms}</Link>
          <Link href="/security">{copy.security}</Link>
          <Link href="/contact">{copy.contact}</Link>
        </nav>
        <p className="legal-footer__meta">{copy.meta}</p>
      </div>
    </footer>
  );
}
