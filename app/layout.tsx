import type { Metadata } from "next";
import CustomerNavHeader from "./components/CustomerNavHeader";
import LegalFooter from "./components/LegalFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyPawLink",
  description: "Care updates for emergency veterinary visits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div className="site-shell">
          <CustomerNavHeader />
          <div className="site-shell__content">{children}</div>
          <LegalFooter />
        </div>
      </body>
    </html>
  );
}
