import type { CSSProperties } from "react";
import Link from "next/link";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

type DbRecord = Record<string, unknown>;

const visitSelect = `
  *,
  owners!visits_owner_id_fkey (
    first_name,
    last_name,
    phone,
    email
  ),
  pets!visits_pet_id_fkey (
    pet_name,
    species,
    other_species,
    breed
  ),
  visit_updates (
    message,
    status,
    created_at
  ),
  forms (
    id,
    form_type,
    form_body,
    form_status,
    signed_name,
    signed_at,
    decline_reason,
    declined_at
  )
`;

const stringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const recordValue = (value: unknown): DbRecord => {
  if (Array.isArray(value)) return (value[0] as DbRecord | undefined) || {};
  if (value && typeof value === "object") return value as DbRecord;
  return {};
};

const arrayValue = (value: unknown): DbRecord[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DbRecord => Boolean(item) && typeof item === "object");
};

const getPetPhotoFromNotes = (notes: string) => {
  const match = notes.match(/\n?\[\[MPL_PET_PHOTO\]\]([\s\S]*?)\[\[\/MPL_PET_PHOTO\]\]/);
  return match?.[1] || "/vet-hero.jpeg";
};

const formatDateTime = (value: unknown) => {
  const dateValue = stringValue(value);
  if (!dateValue) return "";
  return new Date(dateValue).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const renderUnavailable = (title: string, message: string) => (
  <main style={styles.page}>
    <section style={styles.shell}>
      <div style={styles.logoRow}>
        <img src="/mypawlink-logo.png" alt="MyPawLink" style={styles.logo} />
      </div>
      <div style={styles.card}>
        <span style={styles.badge}>Secure visit portal</span>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.text}>{message}</p>
        <Link href="/" style={styles.homeLink}>
          Back to MyPawLink
        </Link>
      </div>
    </section>
  </main>
);

export default async function VisitAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("visit_access_tokens")
    .select("visit_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return renderUnavailable(
      "Visit link not found",
      "Please check the link from the clinic or ask the care team to send a new secure visit link."
    );
  }

  const tokenRecord = tokenRow as DbRecord;
  await supabase
    .from("visit_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token", token);

  const { data: visitData, error: visitError } = await supabase
    .from("visits")
    .select(visitSelect)
    .eq("id", stringValue(tokenRecord.visit_id))
    .single();

  if (visitError || !visitData) {
    return renderUnavailable(
      "Visit unavailable",
      "We could not load this visit right now. Please try again or contact the clinic."
    );
  }

  const visit = visitData as DbRecord;
  const owner = recordValue(visit.owners);
  const pet = recordValue(visit.pets);
  const updates = arrayValue(visit.visit_updates).sort(
    (a, b) =>
      new Date(stringValue(b.created_at)).getTime() -
      new Date(stringValue(a.created_at)).getTime()
  );
  const forms = arrayValue(visit.forms);
  const petName = stringValue(pet.pet_name, "your pet");
  const ownerName = stringValue(owner.first_name, "there");
  const status = stringValue(visit.status, "Request submitted");
  const latestUpdate = updates[0];
  const photoUrl = getPetPhotoFromNotes(stringValue(visit.clinic_notes));

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.logoRow}>
          <img src="/mypawlink-logo.png" alt="MyPawLink" style={styles.logo} />
        </div>

        <div style={styles.greeting}>
          <div>
            <p style={styles.eyebrow}>Secure visit portal</p>
            <h1 style={styles.title}>Hi, {ownerName}.</h1>
            <p style={styles.text}>Here is the latest on {petName}.</p>
          </div>
          <span style={styles.statusBadge}>{status}</span>
        </div>

        <div style={styles.liveCard}>
          <div style={styles.liveCardTop}>
            <span style={styles.liveBadge}>Live Update</span>
          </div>
          <div style={styles.liveBody}>
            <h2 style={styles.updateTitle}>
              {stringValue(latestUpdate?.message) ||
                `${petName}'s visit request has been received.`}
            </h2>
            <img src={photoUrl} alt={petName} style={styles.petAvatar} />
          </div>
        </div>

        <div style={styles.grid}>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Visit Timeline</h2>
            {updates.length > 0 ? (
              <div style={styles.timeline}>
                {updates.map((update, index) => (
                  <div key={`${stringValue(update.message)}-${index}`} style={styles.timelineItem}>
                    <span style={styles.timelineDot} />
                    <div>
                      <strong style={styles.timelineMessage}>{stringValue(update.message)}</strong>
                      <p style={styles.timelineTime}>{formatDateTime(update.created_at)}</p>
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
              {forms.length > 0 ? (
                forms.map((form) => (
                  <div key={stringValue(form.id)} style={styles.formCard}>
                    <div>
                      <strong>{stringValue(form.form_type, "Form")}</strong>
                      <p style={styles.formText}>{stringValue(form.form_body, "Ready for review.")}</p>
                    </div>
                    <span style={styles.formStatus}>
                      {stringValue(form.form_status, "Pending")}
                    </span>
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
    marginBottom: 12,
  },
  liveBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    background: "#dcfce7",
    color: "#047857",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 900,
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
  sectionTitle: {
    color: "#102a3a",
    fontSize: 18,
    margin: "0 0 10px",
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
    background: "#14b8a6",
    marginTop: 5,
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
  badge: {
    display: "inline-flex",
    background: "#dcfce7",
    color: "#047857",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 12,
  },
  homeLink: {
    display: "inline-flex",
    marginTop: 14,
    background: "#087f78",
    color: "#ffffff",
    borderRadius: 8,
    padding: "10px 12px",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 900,
  },
};
