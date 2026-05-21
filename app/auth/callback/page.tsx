"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const finishSignIn = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const authError =
        searchParams.get("error_description") ||
        hashParams.get("error_description") ||
        searchParams.get("error") ||
        hashParams.get("error");

      if (authError) {
        setMessage(authError);
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          return;
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          setMessage(error?.message || "We could not finish signing you in. Please request a new magic link.");
          return;
        }
      }

      const next = searchParams.get("next") || "/?ownerAccess=1";
      window.location.replace(next.startsWith("/") ? next : "/?ownerAccess=1");
    };

    finishSignIn();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f8fbff",
        color: "#082f3f",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(100%, 420px)",
          background: "#ffffff",
          border: "1px solid #dcefeb",
          borderRadius: 8,
          padding: 24,
          boxShadow: "0 12px 30px rgba(41, 64, 83, 0.08)",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>MyPawLink</h1>
        <p style={{ margin: 0, color: "#52606d", lineHeight: 1.5 }}>{message}</p>
      </section>
    </main>
  );
}
