"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";

export const customerHomeEvent = "mypawlink-go-home";

const hiddenRoutePrefixes = ["/auth", "/clinic"];

export default function CustomerNavHeader() {
  const pathname = usePathname();

  if (hiddenRoutePrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const handleHomeNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/") return;

    event.preventDefault();
    window.dispatchEvent(new CustomEvent(customerHomeEvent));
    window.history.replaceState(null, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="customer-nav" aria-label="MyPawLink customer navigation">
      <div className="customer-nav__inner">
        <Link
          href="/"
          className="customer-nav__logo-link"
          onClick={handleHomeNavigation}
          aria-label="Go to MyPawLink homepage"
        >
          <Image
            src="/mypawlink-logo.png"
            alt="MyPawLink"
            className="customer-nav__logo"
            width={190}
            height={72}
            priority
          />
        </Link>
        <Link href="/" className="customer-nav__home-link" onClick={handleHomeNavigation}>
          <span aria-hidden="true" className="customer-nav__home-icon">
            <svg viewBox="0 0 20 20" focusable="false">
              <path
                d="M3 9.4 10 3l7 6.4v6.7c0 .5-.4.9-.9.9h-3.7v-4.8H7.6V17H3.9a.9.9 0 0 1-.9-.9V9.4Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span>Home</span>
        </Link>
      </div>
    </header>
  );
}
