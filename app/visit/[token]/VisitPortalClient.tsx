"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export type OwnerPortalUpdate = {
  message: string;
  time: string;
};

export type OwnerPortalForm = {
  id: string;
  form_type: string;
  form_body: string | null;
  form_status: string;
  signed_name: string | null;
  signed_at: string | null;
  decline_reason: string | null;
  declined_at: string | null;
};

export type OwnerPortalVisit = {
  id: string;
  createdAt: string;
  petName: string;
  species: string;
  ownerFirstName: string;
  status: string;
  updates: OwnerPortalUpdate[];
  forms: OwnerPortalForm[];
  petPhotoUrl: string;
};

type VisitPortalClientProps = {
  token: string;
  initialVisit: OwnerPortalVisit;
};

type RealtimeStatus = "Connecting" | "Live" | "Reconnecting" | "Offline";

const getRealtimeStatus = (status: string): RealtimeStatus => {
  if (status === "SUBSCRIBED") return "Live";
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") return "Reconnecting";
  if (status === "CLOSED") return "Offline";
  return "Connecting";
};

export default function VisitPortalClient({ token, initialVisit }: VisitPortalClientProps) {
  const [visit, setVisit] = useState(initialVisit);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("Connecting");
  const [syncStatus, setSyncStatus] = useState("Live updates are connecting.");
  const [lastSynced, setLastSynced] = useState("");

  const latestUpdate = useMemo(
    () => visit.updates[visit.updates.length - 1],
    [visit.updates]
  );

  const refreshVisit = useCallback(
    async (source: "live" | "manual" | "background") => {
      if (source !== "background") {
        setSyncStatus(source === "live" ? "New clinic update received." : "Refreshing visit.");
      }

      try {
        const response = await fetch("/api/mypawlink", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "loadVisitByToken",
            token,
          }),
        });

        const result = (await response.json().catch(() => null)) as {
          visit?: OwnerPortalVisit;
          error?: string;
        } | null;

        if (!response.ok || !result?.visit) {
          throw new Error(result?.error || "Unable to refresh visit.");
        }

        setVisit(result.visit);
        setLastSynced(
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        );
        setSyncStatus("Latest information is showing.");
      } catch (error) {
        console.error(error);
        setSyncStatus("Connection paused. We will keep trying in the background.");
      }
    },
    [token]
  );

  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel(`visit-access:${token}`)
      .on("broadcast", { event: "visit-updated" }, () => {
        if (!active) return;
        void refreshVisit("live");
      })
      .subscribe((status) => {
        if (!active) return;
        setRealtimeStatus(getRealtimeStatus(status));
        if (status === "SUBSCRIBED") {
          setSyncStatus("Live updates are on.");
        }
      });

    const refreshInterval = window.setInterval(() => {
      void refreshVisit("background");
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshVisit("background");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [refreshVisit, token]);

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.logoRow}>
          <img src="/mypawlink-logo.png" alt="MyPawLink" style={styles.logo} />
        </div>

        <div style={styles.greeting}>
          <div>
            <p style={styles.eyebrow}>Secure visit portal</p>
            <h1 style={styles.title}>Hi, {visit.ownerFirstName || "there"}.</h1>
            <p style={styles.text}>Here is the latest on {visit.petName}.</p>
          </div>
          <span style={styles.statusBadge}>{visit.status}</span>
        </div>

        <div style={styles.liveCard}>
          <div style={styles.liveCardTop}>
            <span
              style={{
                ...styles.liveBadge,
                ...(realtimeStatus === "Live" ? styles.liveBadgeOn : {}),
              }}
            >
              {realtimeStatus}
            </span>
            <button
              type="button"
              style={styles.refreshButton}
              onClick={() => void refreshVisit("manual")}
            >
              Refresh
            </button>
          </div>

          <div style={styles.liveBody}>
            <h2 style={styles.updateTitle}>
              {latestUpdate?.message || `${visit.petName}'s visit request has been received.`}
            </h2>
            <img
              src={visit.petPhotoUrl || "/vet-hero.jpeg"}
              alt={visit.petName}
              style={styles.petAvatar}
            />
          </div>

          <div style={styles.syncRow}>
            <span>{syncStatus}</span>
            {lastSynced && <span>Synced {lastSynced}</span>}
          </div>
        </div>

        <div style={styles.grid}>
          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Live Timeline</h2>
              <span style={styles.timelineCount}>{visit.updates.length} updates</span>
            </div>

            {visit.updates.length > 0 ? (
              <div style={styles.timeline}>
                {[...visit.updates].reverse().map((update, index) => (
                  <div key={`${update.message}-${index}`} style={styles.timelineItem}>
                    <span
                      style={{
                        ...styles.timelineDot,
                        ...(index === 0 ? styles.timelineDotActive : {}),
                      }}
                    />
                    <div>
                      <strong style={styles.timelineMessage}>{update.message}</strong>
                      {update.time && <p style={styles.timelineTime}>{update.time}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.text}>Updates will appear here as the clinic sends them.</p>
            )}
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Care Hub</h2>
            <p style={styles.text}>Forms, approvals, and care documents for this visit.</p>
            <div style={styles.formList}>
              {visit.forms.length > 0 ? (
                visit.forms.map((form) => (
                  <div key={form.id} style={styles.formCard}>
                    <div>
                      <strong>{form.form_type || "Form"}</strong>
                      <p style={styles.formText}>{form.form_body || "Ready for review."}</p>
                    </div>
                    <span style={styles.formStatus}>{form.form_status || "Pending"}</span>
                  </div>
                ))
              ) : (
                <div style={styles.emptyBox}>No forms are pending right now.</div>
              )}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Treatment Estimates</h2>
            <p style={styles.text}>Estimates will appear here when the clinic sends them.</p>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Discharge Documents</h2>
            <p style={styles.text}>
              Discharge instructions and follow-up care will appear here when ready.
            </p>
          </section>

          <Link href="/" style={styles.homeLink}>
            Back to MyPawLink
          </Link>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f7fcfc 0%, #eef8f6 100%)",
    color: "#102a3a",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: "18px 12px 28px",
  },
  shell: {
    width: "min(100%, 430px)",
    margin: "0 auto",
  },
  logoRow: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 10,
  },
  logo: {
    width: 210,
    maxWidth: "76%",
    height: "auto",
  },
  greeting: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 14,
  },
  eyebrow: {
    color: "#087f78",
    fontSize: 11,
    fontWeight: 900,
    margin: "0 0 5px",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 25,
    lineHeight: 1.12,
    margin: "0 0 6px",
    color: "#102a3a",
  },
  text: {
    color: "#52606d",
    fontSize: 14,
    lineHeight: 1.45,
    margin: 0,
  },
  statusBadge: {
    background: "#e6f7f5",
    color: "#0f766e",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    padding: "7px 9px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  liveCard: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 12px 30px rgba(41, 64, 83, 0.08)",
    marginBottom: 14,
  },
  liveCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  liveBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    background: "#f8fbff",
    color: "#64717d",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 900,
  },
  liveBadgeOn: {
    background: "#dcfce7",
    color: "#047857",
    border: "1px solid #bbf7d0",
  },
  refreshButton: {
    background: "#ffffff",
    color: "#087f78",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
  },
  liveBody: {
    display: "grid",
    gridTemplateColumns: "1fr 92px",
    gap: 14,
    alignItems: "center",
  },
  updateTitle: {
    color: "#102a3a",
    fontSize: 16,
    lineHeight: 1.3,
    margin: 0,
  },
  petAvatar: {
    width: 92,
    height: 92,
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #e7fbf7",
  },
  syncRow: {
    borderTop: "1px solid #eef3f4",
    color: "#64717d",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 11,
    fontWeight: 800,
    marginTop: 14,
    paddingTop: 10,
  },
  grid: {
    display: "grid",
    gap: 12,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 10px 25px rgba(41, 64, 83, 0.06)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#102a3a",
    fontSize: 18,
    margin: 0,
  },
  timelineCount: {
    background: "#f0fbf8",
    color: "#087f78",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    padding: "5px 8px",
    fontSize: 11,
    fontWeight: 900,
  },
  timeline: {
    display: "grid",
    gap: 12,
  },
  timelineItem: {
    display: "grid",
    gridTemplateColumns: "12px 1fr",
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#94a3b8",
    marginTop: 5,
  },
  timelineDotActive: {
    background: "#14b8a6",
    boxShadow: "0 0 0 4px #d9fbf4",
  },
  timelineMessage: {
    color: "#102a3a",
    fontSize: 14,
    lineHeight: 1.35,
  },
  timelineTime: {
    color: "#64717d",
    fontSize: 12,
    margin: "4px 0 0",
  },
  formList: {
    display: "grid",
    gap: 10,
    marginTop: 12,
  },
  formCard: {
    display: "grid",
    gap: 10,
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 12,
    background: "#fbffff",
  },
  formText: {
    color: "#52606d",
    fontSize: 13,
    lineHeight: 1.35,
    margin: "5px 0 0",
  },
  formStatus: {
    justifySelf: "start",
    background: "#fff7ed",
    color: "#c2410c",
    border: "1px solid #fed7aa",
    borderRadius: 8,
    padding: "5px 8px",
    fontSize: 11,
    fontWeight: 900,
  },
  emptyBox: {
    background: "#f8fbff",
    border: "1px dashed #a7c9f7",
    borderRadius: 8,
    color: "#52606d",
    padding: 12,
    fontSize: 13,
  },
  homeLink: {
    display: "inline-flex",
    justifyContent: "center",
    background: "#087f78",
    color: "#ffffff",
    borderRadius: 8,
    padding: "10px 12px",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 900,
  },
};
