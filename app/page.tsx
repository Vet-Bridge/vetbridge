"use client";

import { useState } from "react";

type Update = {
  message: string;
  time: string;
};

type Visit = {
  id: number;
  petName: string;
  species: string;
  otherSpecies: string;
  ownerFirstName: string;
  ownerLastName: string;
  phone: string;
  reason: string;
  visitType: string;
  referralName: string;
  beenHereBefore: string;
  clinicNotes: string;
  status: string;
  updates: Update[];
};

export default function Home() {
  const [view, setView] = useState<"home" | "owner" | "clinic" | "status">("home");
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [selectedVisitType, setSelectedVisitType] = useState("");
  const [visits, setVisits] = useState<Visit[]>([]);

  const selectedVisit = visits.find((v) => v.id === selectedVisitId) || null;

  const getOwnerName = (visit: Visit) => `${visit.ownerFirstName} ${visit.ownerLastName}`;
  const getSpecies = (visit: Visit) =>
    visit.species === "Other" ? visit.otherSpecies : visit.species;

  const createVisit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const newVisit: Visit = {
      id: Date.now(),
      petName: String(form.get("petName")),
      species: String(form.get("species")),
      otherSpecies: String(form.get("otherSpecies") || ""),
      ownerFirstName: String(form.get("ownerFirstName")),
      ownerLastName: String(form.get("ownerLastName")),
      phone: String(form.get("phone")),
      reason: String(form.get("reason")),
      visitType: String(form.get("visitType")),
      referralName: String(form.get("referralName") || ""),
      beenHereBefore: String(form.get("beenHereBefore")),
      clinicNotes: "",
      status: "Request submitted",
      updates: [
        {
          message: "Visit request submitted. The clinic will review it shortly.",
          time: new Date().toLocaleTimeString(),
        },
      ],
    };

    setVisits([newVisit, ...visits]);
    setSelectedVisitId(newVisit.id);
    setSelectedSpecies("");
    setSelectedVisitType("");
    setView("status");
  };

  const sendUpdate = (visitId: number, status: string, message: string) => {
    setVisits((current) =>
      current.map((visit) =>
        visit.id === visitId
          ? {
              ...visit,
              status,
              updates: [
                ...visit.updates,
                {
                  message,
                  time: new Date().toLocaleTimeString(),
                },
              ],
            }
          : visit
      )
    );
  };

  const saveClinicNotes = (visitId: number, notes: string) => {
    setVisits((current) =>
      current.map((visit) =>
        visit.id === visitId ? { ...visit, clinicNotes: notes } : visit
      )
    );
  };

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroLeft}>
          <div style={styles.logoMark}>VB</div>

          <h1 style={styles.logo}>VetBridge</h1>
          <p style={styles.tagline}>Bridging care. Connecting hearts.</p>

          <h2 style={styles.heroTitle}>
            Peace of mind when they need it most.
          </h2>

          <p style={styles.heroSubtitle}>
            Real-time updates from your vet clinic so pet owners are never left wondering.
          </p>

          <div style={styles.featureRow}>
            <InfoCard icon="💬" title="Real-time updates" text="Know what is happening every step of the way." />
            <InfoCard icon="🛡️" title="Better communication" text="Stay informed without the stress of calling." />
            <InfoCard icon="❤️" title="Stronger trust" text="Keep owners and clinics connected during care." />
          </div>
        </div>

        <div style={styles.heroRight}>
          <div style={styles.petImageBox}>
            <img
              src="/vet-hero.jpeg"
              alt="Dog with veterinarian"
              style={styles.heroImage}
            />
          </div>

          <div style={styles.buttonRow}>
            <button style={styles.primaryCardButton} onClick={() => setView("owner")}>
              <span style={styles.bigIcon}>👥</span>
              <div style={styles.buttonText}>
                <div style={styles.buttonTitle}>I am a Pet Owner</div>
                <div style={styles.buttonSubtitle}>
                  Submit a visit request and get real-time updates.
                </div>
              </div>
            </button>

            <button style={styles.darkCardButton} onClick={() => setView("clinic")}>
              <span style={styles.bigIcon}>🩺</span>
              <div style={styles.buttonText}>
                <div style={styles.buttonTitle}>I work at a Vet Clinic</div>
                <div style={styles.buttonSubtitle}>
                  View requests and send updates to pet owners.
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      <section style={styles.mainGrid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <button style={styles.smallButton} onClick={() => setView("home")}>
              ← Home
            </button>
          </div>

          {view === "home" && (
            <div style={styles.homeMessage}>
              <h2 style={styles.title}>Welcome to VetBridge</h2>
              <p style={styles.text}>
                Choose Pet Owner to submit a visit request or Vet Clinic to manage updates.
              </p>
            </div>
          )}

          {view === "owner" && (
            <section>
              <h2 style={styles.title}>Pet Owner</h2>
              <p style={styles.text}>Submit a visit request</p>

              <div style={styles.noticeBox}>
                <strong>We’re here to help your pet.</strong>
                <p>
                  Please provide the details below so our team can be prepared for your arrival.
                </p>
              </div>

              <form onSubmit={createVisit} style={styles.form}>
                <input style={styles.input} name="petName" placeholder="Pet name" required />

                <select
                  style={styles.input}
                  name="species"
                  required
                  value={selectedSpecies}
                  onChange={(e) => setSelectedSpecies(e.target.value)}
                >
                  <option value="">Species</option>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Other">Other</option>
                </select>

                {selectedSpecies === "Other" && (
                  <input
                    style={styles.input}
                    name="otherSpecies"
                    placeholder="Enter pet type, for example Rabbit or Bird"
                    required
                  />
                )}

                <input
                  style={styles.input}
                  name="ownerFirstName"
                  placeholder="Owner first name"
                  required
                />

                <input
                  style={styles.input}
                  name="ownerLastName"
                  placeholder="Owner last name"
                  required
                />

                <input style={styles.input} name="phone" placeholder="Phone number" required />

                <select
                  style={styles.input}
                  name="visitType"
                  required
                  value={selectedVisitType}
                  onChange={(e) => setSelectedVisitType(e.target.value)}
                >
                  <option value="">Visit type</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Vet referral">Vet referral</option>
                  <option value="Follow up">Follow up</option>
                </select>

                {selectedVisitType === "Vet referral" && (
                  <input
                    style={styles.input}
                    name="referralName"
                    placeholder="Referring vet or clinic name"
                    required
                  />
                )}

                <textarea
                  style={styles.textarea}
                  name="reason"
                  placeholder="What is going on with your pet?"
                  required
                />

                <div>
                  <p style={styles.label}>Has your pet been in this location before?</p>
                  <div style={styles.radioRow}>
                    <label style={styles.radioBox}>
                      <input type="radio" name="beenHereBefore" value="Yes" required /> Yes
                    </label>
                    <label style={styles.radioBox}>
                      <input type="radio" name="beenHereBefore" value="No" required /> No
                    </label>
                  </div>
                </div>

                <button style={styles.primaryButton} type="submit">
                  Submit Visit Request
                </button>
              </form>
            </section>
          )}

          {view === "clinic" && (
            <section>
              <div style={styles.dashboardHeader}>
                <div>
                  <h2 style={styles.title}>Clinic Dashboard</h2>
                  <p style={styles.text}>Review visit requests and send updates.</p>
                </div>
                <span style={styles.counter}>{visits.length} Active Request(s)</span>
              </div>

              {visits.length === 0 && (
                <div style={styles.emptyBox}>
                  No visit requests yet. Submit one from the Pet Owner page.
                </div>
              )}

              <div style={styles.visitList}>
                {visits.map((visit) => (
                  <div key={visit.id} style={styles.visitCard}>
                    <div style={styles.visitHeader}>
                      <div>
                        <h3 style={styles.petName}>
                          {visit.petName} <span style={styles.speciesPill}>{getSpecies(visit)}</span>
                        </h3>
                        <p style={styles.text}>Owner: {getOwnerName(visit)}</p>
                        <p style={styles.text}>Phone: {visit.phone}</p>
                      </div>

                      <div>
                        <p style={styles.status}>{visit.status}</p>
                        <p style={styles.pill}>{visit.visitType}</p>
                      </div>
                    </div>

                    {visit.visitType === "Vet referral" && (
                      <p style={styles.text}>Referral: {visit.referralName}</p>
                    )}

                    <p style={styles.text}>Been here before: {visit.beenHereBefore}</p>
                    <p style={styles.text}>Reason: {visit.reason}</p>

                    <textarea
                      style={styles.notesBox}
                      placeholder="Clinic notes — only visible to the clinic."
                      value={visit.clinicNotes}
                      onChange={(e) => saveClinicNotes(visit.id, e.target.value)}
                    />

                    <div style={styles.actionGrid}>
                      <button style={styles.greenAction} onClick={() => sendUpdate(visit.id, "Accepted", `Your visit request for ${visit.petName} has been accepted.`)}>
                        Accept Visit
                      </button>

                      <button style={styles.blueAction} onClick={() => sendUpdate(visit.id, "Checked in", `${visit.petName} has been checked in and is waiting for the medical team.`)}>
                        Checked In
                      </button>

                      <button style={styles.purpleAction} onClick={() => sendUpdate(visit.id, "Doctor reviewing", `The doctor is reviewing ${visit.petName}'s case now.`)}>
                        Doctor Reviewing
                      </button>

                      <button style={styles.orangeAction} onClick={() => sendUpdate(visit.id, "Treatment started", `Treatment has started for ${visit.petName}. We will continue to keep you updated.`)}>
                        Treatment Started
                      </button>

                      <button style={styles.tealAction} onClick={() => sendUpdate(visit.id, "In observation", `${visit.petName} is resting and being monitored by the team.`)}>
                        In Observation
                      </button>

                      <button style={styles.redAction} onClick={() => sendUpdate(visit.id, "Ready for pickup", `${visit.petName} is ready for pickup. Please check in at the front desk when you arrive.`)}>
                        Ready for Pickup
                      </button>
                    </div>

                    <button
                      style={styles.secondaryButton}
                      onClick={() => {
                        setSelectedVisitId(visit.id);
                        setView("status");
                      }}
                    >
                      View Owner Page
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {view === "status" && selectedVisit && (
            <section>
              <button style={styles.smallButton} onClick={() => setView("clinic")}>
                ← Back to Dashboard
              </button>

              <h2 style={styles.title}>{selectedVisit.petName}’s Visit Updates</h2>
              <p style={styles.status}>Current status: {selectedVisit.status}</p>

              <div style={styles.detailsBox}>
                <p>Pet: {selectedVisit.petName} ({getSpecies(selectedVisit)})</p>
                <p>Owner: {getOwnerName(selectedVisit)}</p>
                <p>Visit Type: {selectedVisit.visitType}</p>
                {selectedVisit.visitType === "Vet referral" && (
                  <p>Referral: {selectedVisit.referralName}</p>
                )}
                <p>Been here before: {selectedVisit.beenHereBefore}</p>
              </div>

              <div style={styles.timeline}>
                {selectedVisit.updates.map((update, index) => (
                  <div key={index} style={styles.timelineItem}>
                    <div style={styles.timelineDot}>✓</div>
                    <div style={styles.timelineContent}>
                      <p style={styles.timelineMessage}>{update.message}</p>
                      <small>{update.time}</small>
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.noticeBox}>
                We will keep you updated every step of the way.
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div style={styles.infoCard}>
      <div style={styles.infoIcon}>{icon}</div>
      <h3>{title}</h3>
      <p style={styles.smallText}>{text}</p>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f4fbfb, #ffffff)",
    fontFamily: "Arial, sans-serif",
    color: "#0f2f4f",
    padding: 18,
  },
  hero: {
    maxWidth: 1180,
    margin: "0 auto 18px",
    background: "white",
    borderRadius: 28,
    padding: 34,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 30,
    boxShadow: "0 15px 40px rgba(20, 47, 79, 0.12)",
  },
  heroLeft: {},
  heroRight: {
    display: "grid",
    alignContent: "center",
    gap: 22,
  },
  logoMark: {
    width: 62,
    height: 62,
    borderRadius: 18,
    background: "linear-gradient(135deg, #079487, #244f76)",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 22,
    boxShadow: "0 10px 25px rgba(7, 148, 135, 0.25)",
  },
  logo: {
    fontSize: 54,
    margin: "16px 0 0",
    color: "#0b6770",
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 4,
    color: "#08736f",
    fontSize: 17,
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 1.1,
    marginTop: 30,
    marginBottom: 12,
    color: "#12345a",
  },
  heroSubtitle: {
    color: "#405b75",
    fontSize: 18,
    maxWidth: 420,
  },
  petImageBox: {
    minHeight: 280,
    borderRadius: 28,
    overflow: "hidden",
    border: "1px solid #d7e8e8",
    boxShadow: "0 10px 25px rgba(20, 47, 79, 0.12)",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    minHeight: 280,
    objectFit: "cover",
    display: "block",
  },
  featureRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    marginTop: 30,
  },
  infoCard: {
    textAlign: "center",
  },
  infoIcon: {
    width: 56,
    height: 56,
    margin: "0 auto 10px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#dff5f1",
    fontSize: 25,
  },
  smallText: {
    color: "#526b6b",
    fontSize: 13,
    lineHeight: 1.4,
  },
  buttonRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  primaryCardButton: {
    background: "linear-gradient(135deg, #079487, #08736f)",
    color: "white",
    border: "none",
    padding: 22,
    borderRadius: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 16,
    textAlign: "left",
    fontSize: 18,
    minHeight: 130,
  },
  darkCardButton: {
    background: "linear-gradient(135deg, #244f76, #12345a)",
    color: "white",
    border: "none",
    padding: 22,
    borderRadius: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 16,
    textAlign: "left",
    fontSize: 18,
    minHeight: 130,
  },
  bigIcon: {
    fontSize: 34,
    flexShrink: 0,
  },
  buttonText: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  buttonTitle: {
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.2,
  },
  buttonSubtitle: {
    fontSize: 15,
    opacity: 0.92,
    lineHeight: 1.4,
  },
  mainGrid: {
    maxWidth: 1180,
    margin: "0 auto",
  },
  panel: {
    background: "white",
    borderRadius: 24,
    padding: 28,
    boxShadow: "0 15px 40px rgba(20, 47, 79, 0.1)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  homeMessage: {
    textAlign: "center",
    padding: 40,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
    color: "#12345a",
  },
  text: {
    color: "#526b6b",
    lineHeight: 1.5,
  },
  form: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    maxWidth: 780,
  },
  input: {
    padding: 15,
    borderRadius: 12,
    border: "1px solid #c8dddd",
    fontSize: 16,
    outline: "none",
  },
  textarea: {
    gridColumn: "1 / -1",
    padding: 15,
    borderRadius: 12,
    border: "1px solid #c8dddd",
    fontSize: 16,
    minHeight: 115,
    outline: "none",
  },
  label: {
    fontWeight: 700,
    marginBottom: 10,
    color: "#12345a",
  },
  radioRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  radioBox: {
    border: "1px solid #c8dddd",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  primaryButton: {
    gridColumn: "1 / -1",
    background: "linear-gradient(135deg, #079487, #08736f)",
    color: "white",
    border: "none",
    padding: "15px 20px",
    borderRadius: 14,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
  },
  secondaryButton: {
    background: "white",
    color: "#12345a",
    border: "1px solid #9bbfd6",
    padding: "13px 18px",
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 15,
    width: "100%",
  },
  smallButton: {
    background: "#eef7f6",
    border: "none",
    padding: "10px 15px",
    borderRadius: 12,
    cursor: "pointer",
    color: "#12345a",
  },
  noticeBox: {
    background: "#eefaf8",
    border: "1px solid #bfe4df",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  dashboardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 15,
    flexWrap: "wrap",
  },
  counter: {
    background: "#dff5f1",
    color: "#08736f",
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 700,
  },
  emptyBox: {
    background: "#f8fbff",
    border: "1px dashed #aac8c8",
    borderRadius: 14,
    padding: 22,
  },
  visitList: {
    display: "grid",
    gap: 18,
    marginTop: 18,
  },
  visitCard: {
    background: "#ffffff",
    border: "1px solid #dcecec",
    borderRadius: 20,
    padding: 22,
    boxShadow: "0 8px 20px rgba(20, 47, 79, 0.05)",
  },
  visitHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },
  petName: {
    margin: 0,
    fontSize: 26,
    color: "#12345a",
  },
  speciesPill: {
    background: "#dbeafe",
    color: "#2357a7",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 14,
  },
  status: {
    background: "#e5f0ff",
    color: "#2357a7",
    padding: "8px 12px",
    borderRadius: 999,
    display: "inline-block",
    fontWeight: 700,
  },
  pill: {
    background: "#edf7f5",
    color: "#08736f",
    padding: "8px 12px",
    borderRadius: 999,
    display: "inline-block",
    marginLeft: 8,
  },
  notesBox: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #c8dddd",
    fontSize: 15,
    minHeight: 85,
    marginTop: 12,
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginTop: 18,
    marginBottom: 18,
  },
  greenAction: actionStyle("#ecfdf3", "#027a48"),
  blueAction: actionStyle("#eff6ff", "#1d4ed8"),
  purpleAction: actionStyle("#faf5ff", "#7e22ce"),
  orangeAction: actionStyle("#fff7ed", "#ea580c"),
  tealAction: actionStyle("#ecfeff", "#0f766e"),
  redAction: actionStyle("#fff1f2", "#e11d48"),
  detailsBox: {
    background: "#f8fbff",
    borderRadius: 16,
    padding: 18,
    margin: "18px 0",
    border: "1px solid #dcecec",
  },
  timeline: {
    display: "grid",
    gap: 12,
    marginBottom: 20,
  },
  timelineItem: {
    display: "grid",
    gridTemplateColumns: "40px 1fr",
    gap: 12,
    alignItems: "start",
  },
  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#079487",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
  },
  timelineContent: {
    background: "#ffffff",
    border: "1px solid #dcecec",
    borderRadius: 12,
    padding: 14,
  },
  timelineMessage: {
    margin: "0 0 8px",
  },
};

function actionStyle(background: string, color: string): React.CSSProperties {
  return {
    background,
    color,
    border: `1px solid ${color}33`,
    padding: 12,
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  };
}