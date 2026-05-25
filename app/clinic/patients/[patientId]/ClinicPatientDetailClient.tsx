"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../../lib/supabase";

type Update = {
  message: string;
  time: string;
};

type EstimateItem = Record<string, unknown>;

type VisitForm = {
  id: string;
  form_type: string;
  form_body: string | null;
  form_status: string;
  signed_name: string | null;
  signed_at: string | null;
  decline_reason: string | null;
  declined_at: string | null;
};

type Visit = {
  id: string;
  createdAt: string;
  petName: string;
  species: string;
  otherSpecies: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  phone: string;
  reason: string;
  visitType: string;
  referralName: string;
  beenHereBefore: string;
  clinicNotes: string;
  status: string;
  updates: Update[];
  breed: string;
  consentFormType: string;
  consentSignedName: string;
  consentSignedAt: string;
  estimateItems: EstimateItem[];
  estimateTotal: number;
  estimateStatus: string;
  workflowStep: string;
  forms: VisitForm[];
  petPhotoUrl: string;
  accessToken: string;
  accessUrl: string;
};

type StaffRole = "Front Desk" | "Technician" | "Veterinarian" | "Admin";

type StaffProfile = {
  email: string;
  fullName: string;
  role: StaffRole;
};

type DoctorOption = {
  name: string;
  profileUrl: string;
};

type OwnerNotificationSummary = {
  channel: "sms";
  status: "sent" | "skipped" | "failed";
  reason: string;
  error: string;
  link: string;
};

type ClinicActionResult = {
  visit: Visit;
  notification: OwnerNotificationSummary | null;
};

type PrimaryClinicalAction =
  | {
      kind: "assignDoctor";
      label: string;
      helper: string;
    }
  | {
      kind: "acceptVisit" | "startTriage" | "updateDiagnostics" | "sendEstimate" | "sendDischarge" | "sendOwnerUpdate";
      label: string;
      helper: string;
    };

const doctors: DoctorOption[] = [
  { name: "Rivera", profileUrl: "https://mypawlink.com" },
  { name: "Chen", profileUrl: "https://mypawlink.com" },
  { name: "Patel", profileUrl: "https://mypawlink.com" },
  { name: "Morgan", profileUrl: "https://mypawlink.com" },
];

const doctorMetaStart = "[[MPL_DOCTOR_ASSIGNMENT]]";
const doctorMetaEnd = "[[/MPL_DOCTOR_ASSIGNMENT]]";
const doctorMetaPattern = /\n?\[\[MPL_DOCTOR_ASSIGNMENT\]\]([\s\S]*?)\[\[\/MPL_DOCTOR_ASSIGNMENT\]\]/;

const petPhotoMetaStart = "[[MPL_PET_PHOTO]]";
const petPhotoMetaEnd = "[[/MPL_PET_PHOTO]]";
const petPhotoMetaPattern = /\n?\[\[MPL_PET_PHOTO\]\]([\s\S]*?)\[\[\/MPL_PET_PHOTO\]\]/;

const compactWorkflowSteps = ["Request", "Check-In", "Triage", "Doctor", "Diagnostics", "Treatment", "Discharge"];
const emergencyCareConsentTitle = "Emergency Care Consent";
const defaultPetAvatarSrc = "/pet-placeholder-avatar.svg";

const getAssignedDoctorFromNotes = (notes: string): DoctorOption | null => {
  const match = notes.match(doctorMetaPattern);
  if (!match) return null;

  try {
    const doctor = JSON.parse(match[1]) as Partial<DoctorOption>;
    if (!doctor.name || !doctor.profileUrl) return null;
    return {
      name: doctor.name,
      profileUrl: doctor.profileUrl,
    };
  } catch {
    return null;
  }
};

const removeDoctorMetadata = (notes: string) => notes.replace(doctorMetaPattern, "").trim();
const getPetPhotoFromNotes = (notes: string) => notes.match(petPhotoPatternSafe())?.[1] || "";
const removePetPhotoMetadata = (notes: string) => notes.replace(petPhotoMetaPattern, "").trim();
const removeAppMetadata = (notes: string) => removePetPhotoMetadata(removeDoctorMetadata(notes)).trim();

function petPhotoPatternSafe() {
  return petPhotoMetaPattern;
}

const combineClinicNotes = (
  visibleNotes: string,
  doctor: DoctorOption | null,
  petPhotoUrl: string
) =>
  [
    visibleNotes.trim(),
    doctor ? doctorMetaStart + JSON.stringify(doctor) + doctorMetaEnd : "",
    petPhotoUrl ? petPhotoMetaStart + petPhotoUrl + petPhotoMetaEnd : "",
  ]
    .filter(Boolean)
    .join("\n");

const withDoctorMetadata = (notes: string, doctor: DoctorOption) =>
  combineClinicNotes(removeAppMetadata(notes), doctor, getPetPhotoFromNotes(notes));

const getOwnerName = (visit: Visit) => (visit.ownerFirstName + " " + visit.ownerLastName).trim() || "Owner not provided";

const getSpecies = (visit: Visit) =>
  visit.species === "Other" ? visit.otherSpecies : visit.species;

const getIntakeField = (visit: Visit, label: string) => {
  const match = visit.reason
    .split("\n")
    .find((line) => line.toLowerCase().startsWith(label.toLowerCase() + ":"));

  return match?.split(":").slice(1).join(":").trim() || "Not provided";
};

const getIntakeSummary = (visit: Visit) => ({
  age: getIntakeField(visit, "Approx. age"),
  weight: getIntakeField(visit, "Weight"),
  chiefComplaint: getIntakeField(visit, "Emergency reason"),
  symptom: getIntakeField(visit, "Primary symptom"),
  started: getIntakeField(visit, "Started"),
  breathing: getIntakeField(visit, "Breathing normally"),
  mobility: getIntakeField(visit, "Can walk"),
  medications: getIntakeField(visit, "Current medications"),
  allergies: getIntakeField(visit, "Allergies"),
});

const getCompactPatientMetaLine = (visit: Visit) => {
  const intake = getIntakeSummary(visit);
  return [
    getSpecies(visit) || "Species not provided",
    visit.breed || "Breed not provided",
    intake.age !== "Not provided" ? intake.age : "",
    visit.visitType || "Walk-in",
  ]
    .filter(Boolean)
    .join(" - ");
};

const getTriageLevel = (visit: Visit) => {
  const status = visit.status.toLowerCase();
  if (status.includes("critical") || status.includes("red")) return "Critical";
  if (status.includes("urgent") || status.includes("orange") || status.includes("yellow")) return "Urgent";
  if (status.includes("stable") || status.includes("green")) return "Stable";
  return "Pending";
};

const getClinicWorkflowStatusLabel = (visit: Visit) => {
  const status = visit.status.toLowerCase();
  if (status.includes("request") || status.includes("accepted") || status.includes("checked")) return "Awaiting Triage";
  if (status.includes("triage")) return "Triage In Progress";
  if (status.includes("doctor")) return "Doctor Reviewing";
  if (status.includes("diagnostic") || status.includes("result")) return "Diagnostics Active";
  if (status.includes("estimate")) return "Estimate Pending";
  if (status.includes("ready")) return "Ready for Pickup";
  if (status.includes("closed")) return "Closed";
  return visit.status || "Awaiting Triage";
};

const isCriticalVisit = (visit: Visit) => {
  const status = visit.status.toLowerCase();
  return status.includes("critical") || status.includes("red");
};

const getEmergencyConsentForm = (visit: Visit) =>
  visit.forms.find((form) => form.form_type.toLowerCase() === emergencyCareConsentTitle.toLowerCase()) || null;

const getEmergencyConsentStatus = (visit: Visit) => {
  const form = getEmergencyConsentForm(visit);
  if (!form) return { label: "Pending", detail: "Consent pending - send reminder", form };
  if (form.form_status === "Signed") {
    return {
      label: "Signed",
      detail: "Emergency Care Consent signed at " + (form.signed_at ? new Date(form.signed_at).toLocaleString() : "unknown time"),
      form,
    };
  }
  if (form.form_status === "Declined") {
    return {
      label: "Declined",
      detail: "Owner declined consent. The veterinary team may need to contact them before care can continue.",
      form,
    };
  }
  return { label: "Pending", detail: "Consent pending - send reminder", form };
};

const getStatusChips = (visit: Visit, doctor: DoctorOption | null) => {
  const chips: { label: string; tone: "neutral" | "teal" | "orange" | "red" | "blue" }[] = [];
  const status = visit.status.toLowerCase();
  const visitType = (visit.visitType || "").toLowerCase();

  if (visitType.includes("referral") || visit.referralName) {
    chips.push({ label: "Referral", tone: "blue" });
  }
  if (status.includes("converted")) chips.push({ label: "Converted", tone: "teal" });
  if (getTriageLevel(visit) === "Pending") chips.push({ label: "Needs Triage", tone: "orange" });
  if (getEmergencyConsentStatus(visit).label === "Pending") {
    chips.push({ label: "Consent Pending", tone: "orange" });
  }
  if (!doctor) chips.push({ label: "Doctor Needed", tone: "neutral" });
  if (isCriticalVisit(visit)) chips.push({ label: "Critical", tone: "red" });

  return chips.slice(0, 4);
};

const getVisitTimelineIndex = (visit: Visit) => {
  const status = visit.status.toLowerCase();
  const doctorAssigned = Boolean(getAssignedDoctorFromNotes(visit.clinicNotes));

  if (status.includes("closed")) return 12;
  if (status.includes("discharged")) return 11;
  if (status.includes("ready")) return 10;
  if (status.includes("hospital") || status.includes("icu") || status.includes("monitor")) return 9;
  if (status.includes("treatment") || status.includes("surgery")) return 8;
  if (visit.estimateStatus.toLowerCase().includes("approved")) return 7;
  if (status.includes("estimate") || visit.estimateStatus.toLowerCase().includes("pending") || visit.estimateTotal > 0) return 6;
  if (status.includes("diagnostic") || status.includes("x-ray") || status.includes("bloodwork")) return 5;
  if (status.includes("exam") || status.includes("doctor")) return 4;
  if (doctorAssigned) return 3;
  if (status.includes("triage") || status.includes("stabil")) return 2;
  if (status.includes("checked") || status.includes("accepted")) return 1;
  return 0;
};

const getCompactWorkflowIndex = (visit: Visit) => {
  const timelineIndex = getVisitTimelineIndex(visit);
  if (timelineIndex >= 10) return 6;
  if (timelineIndex >= 8) return 5;
  if (timelineIndex >= 5) return 4;
  if (timelineIndex >= 3) return 3;
  if (timelineIndex >= 2) return 2;
  if (timelineIndex >= 1) return 1;
  return 0;
};

const getPrimaryClinicalAction = (visit: Visit, doctor: DoctorOption | null): PrimaryClinicalAction => {
  const status = visit.status.toLowerCase();
  const triage = getTriageLevel(visit);

  if (status.includes("ready") || status.includes("discharge")) {
    return { kind: "sendDischarge", label: "Send Discharge", helper: "Send pickup or discharge instructions to the owner." };
  }
  if (status.includes("estimate") || visit.estimateStatus.toLowerCase().includes("pending") || (visit.estimateTotal > 0 && !visit.estimateStatus.toLowerCase().includes("approved"))) {
    return { kind: "sendEstimate", label: "Send Estimate", helper: "Request owner approval for the treatment estimate." };
  }
  if (status.includes("diagnostic") || status.includes("result") || status.includes("bloodwork")) {
    return { kind: "updateDiagnostics", label: "Update Diagnostics", helper: "Send a diagnostics milestone or results-waiting update." };
  }
  if (status.includes("request") || status.includes("waiting")) {
    return { kind: "acceptVisit", label: "Accept Visit", helper: "Accept the request or start triage immediately if the case is urgent." };
  }
  if (triage === "Pending" || status.includes("accepted") || status.includes("checked")) {
    return { kind: "startTriage", label: "Start Triage", helper: "Begin triage and assign a medical urgency level." };
  }
  if (!doctor) {
    return { kind: "assignDoctor", label: "Assign Doctor", helper: "Choose the doctor responsible for owner-facing updates." };
  }
  return { kind: "sendOwnerUpdate", label: "Send Owner Update", helper: "Share the next owner-facing care milestone." };
};

const getActionCenterCategory = (visit: Visit) => {
  const status = visit.status.toLowerCase();
  if (status.includes("closed") || status.includes("discharged") || status.includes("ready")) return "discharge";
  if (status.includes("treatment") || status.includes("surgery") || status.includes("recover") || status.includes("stable") || status.includes("critical") || status.includes("icu") || status.includes("hospital")) return "treatment";
  if (status.includes("doctor") || status.includes("exam") || status.includes("diagnostic") || status.includes("result") || status.includes("estimate")) return "diagnostics";
  if (status.includes("accepted") || status.includes("checked") || status.includes("triage")) return "registration";
  return "arrival";
};

const getActionCenterTitle = (visit: Visit) => {
  const labels: Record<string, string> = {
    arrival: "Arrival / Triage",
    registration: "Registration / Consent",
    diagnostics: "Doctor / Diagnostics",
    treatment: "Treatment",
    discharge: "Discharge",
  };

  return labels[getActionCenterCategory(visit)] || "Action Center";
};

export default function ClinicPatientDetailClient({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [clinicError, setClinicError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [staffLoginEmail, setStaffLoginEmail] = useState("");
  const [staffLoginPassword, setStaffLoginPassword] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [ownerUpdateDraft, setOwnerUpdateDraft] = useState("");

  const apiRequest = async <T,>(payload: Record<string, unknown>): Promise<T> => {
    const { data } = await supabase.auth.getSession();
    const authToken = data.session?.access_token;

    const response = await fetch("/api/mypawlink", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authToken ? { ...payload, authToken } : payload),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(result?.error || "Request failed.");
    }

    return response.json() as Promise<T>;
  };

  const syncStaffProfile = async (session: Session | null) => {
    if (!session) {
      setStaffProfile(null);
      return null;
    }

    try {
      const response = await fetch("/api/mypawlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getStaffProfile",
          authToken: session.access_token,
        }),
      });
      if (!response.ok) throw new Error("Unable to load staff profile.");

      const result = (await response.json()) as { staffProfile: StaffProfile | null };
      setStaffProfile(result.staffProfile);
      return result.staffProfile;
    } catch {
      setStaffProfile(null);
      return null;
    }
  };

  const loadPatient = async () => {
    setLoading(true);
    setClinicError("");

    try {
      const result = await apiRequest<{ visits: Visit[] }>({ action: "loadVisits" });
      setVisit(result.visits.find((item) => item.id === patientId) || null);
    } catch (error) {
      setClinicError(error instanceof Error ? error.message : "Unable to load patient.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const profile = await syncStaffProfile(data.session);
      if (active && profile) await loadPatient();
      if (active) {
        setAuthChecked(true);
        if (!profile) setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      const profile = await syncStaffProfile(session);
      if (active && profile) await loadPatient();
      if (active) {
        setAuthChecked(true);
        if (!profile) setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // Route identity is the only value that should restart this patient-screen session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const signInClinicStaff = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    setClinicError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: staffLoginEmail.trim(),
      password: staffLoginPassword,
    });

    if (error) {
      setAuthLoading(false);
      setAuthMessage(error.message);
      return;
    }

    const profile = await syncStaffProfile(data.session);
    setAuthMessage(profile ? "Clinic staff signed in." : "Signed in, but this email is not active as clinic staff yet.");
    setAuthLoading(false);
    if (profile) await loadPatient();
  };

  const runAction = async (label: string, action: () => Promise<void>) => {
    if (pendingAction) return;
    setPendingAction(label);
    try {
      await action();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to complete action.");
    } finally {
      setPendingAction("");
    }
  };

  const sendUpdate = async (status: string, message: string) => {
    if (!visit) return;
    await runAction("Sending update...", async () => {
      const result = await apiRequest<ClinicActionResult>({
        action: "sendUpdate",
        visitId: visit.id,
        status,
        message,
      });
      setVisit(result.visit);
    });
  };

  const assignDoctorToVisit = async (doctorName: string) => {
    if (!visit) return;
    const doctor = doctors.find((item) => item.name === doctorName);
    if (!doctor) return;
    const updatedNotes = withDoctorMetadata(visit.clinicNotes, doctor);

    await runAction("Assigning doctor...", async () => {
      const result = await apiRequest<ClinicActionResult>({
        action: "assignDoctor",
        visitId: visit.id,
        clinicNotes: updatedNotes,
        message: "Dr. " + doctor.name + " is now assigned to " + visit.petName + "'s case and will review the plan with you shortly.",
      });
      setVisit(result.visit);
    });
  };

  const sendFormToVisit = async (formType: string, formBody: string, updateMessage: string) => {
    if (!visit) return;

    await runAction("Sending form...", async () => {
      const result = await apiRequest<ClinicActionResult>({
        action: "sendForm",
        visitId: visit.id,
        formType,
        formBody,
        status: visit.status,
        message: updateMessage,
      });
      setVisit(result.visit);
    });
  };

  const sendEmergencyConsentReminder = async () => {
    if (!visit) return;

    await runAction("Sending consent reminder...", async () => {
      const result = await apiRequest<ClinicActionResult>({
        action: "sendEmergencyConsent",
        visitId: visit.id,
        status: visit.status,
      });
      setVisit(result.visit);
    });
  };

  const sendEstimateApproval = async () => {
    if (!visit) return;
    const estimateTitle = window.prompt("Estimate title", "Emergency treatment estimate") || "Emergency treatment estimate";
    const estimateTotal = window.prompt("Estimate total as a number, for example 1200");
    if (!estimateTotal) return;
    const amount = Number(estimateTotal.replace(/[$,]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter the estimate amount as a number.");
      return;
    }
    const estimateDetails = window.prompt("What is included in the estimate?");
    if (!estimateDetails) return;

    await runAction("Sending estimate...", async () => {
      const result = await apiRequest<ClinicActionResult>({
        action: "createEstimate",
        visitId: visit.id,
        title: estimateTitle,
        amount,
        description: estimateDetails,
      });
      setVisit(result.visit);
    });
  };

  const sendDischargeInstructions = async () => {
    if (!visit) return;
    const instructions = window.prompt("Enter discharge instructions for the owner");
    if (!instructions) return;
    await sendFormToVisit(
      "Discharge instructions acknowledgement",
      instructions,
      visit.petName + "'s discharge instructions are ready for review."
    );
  };

  const sendOwnerUpdate = async (message: string, status = visit?.status || "") => {
    if (!visit) return;
    const updateMessage = [message, ownerUpdateDraft.trim()].filter(Boolean).join("\n");
    if (!updateMessage.trim()) {
      alert("Add a message or choose a template before sending.");
      return;
    }
    await sendUpdate(status || visit.status, updateMessage);
    setOwnerUpdateDraft("");
  };

  const runPrimaryClinicalAction = async (primaryClinicalAction: PrimaryClinicalAction) => {
    if (!visit) return;
    if (primaryClinicalAction.kind === "acceptVisit") {
      await sendUpdate("Visit accepted", visit.petName + " has been accepted by the emergency team and is waiting for triage.");
      return;
    }
    if (primaryClinicalAction.kind === "startTriage") {
      await sendUpdate("Triage in progress", visit.petName + "'s triage assessment has started.");
      return;
    }
    if (primaryClinicalAction.kind === "updateDiagnostics") {
      await sendUpdate("Diagnostics underway", "Diagnostics are being updated for " + visit.petName + ".");
      return;
    }
    if (primaryClinicalAction.kind === "sendEstimate") {
      await sendEstimateApproval();
      return;
    }
    if (primaryClinicalAction.kind === "sendDischarge") {
      await sendDischargeInstructions();
      return;
    }
    await sendOwnerUpdate("There is a new update for " + visit.petName + ".");
  };

  const stageActions = (actionCategory: string, doctor: DoctorOption | null) => {
    if (!visit) return null;

    if (actionCategory === "arrival") {
      return (
        <div style={styles.actionGrid}>
          <button style={styles.actionButtonTeal} onClick={() => sendUpdate("Visit accepted", visit.petName + " has been accepted by the emergency team and is waiting for triage.")}>Accept Visit</button>
          <button style={styles.actionButtonBlue} onClick={() => sendUpdate("Triage in progress", visit.petName + "'s triage assessment has started.")}>Start Triage</button>
          <button style={styles.actionButtonRed} onClick={() => sendUpdate("Critical triage", visit.petName + " has been triaged as critical and moved immediately to treatment.")}>Critical</button>
          <button style={styles.actionButtonOrange} onClick={() => sendUpdate("Urgent triage", visit.petName + " has been triaged as urgent and is being stabilized.")}>Urgent</button>
          <button style={styles.actionButtonTeal} onClick={() => sendUpdate("Stable triage", visit.petName + " has been triaged as stable and will be seen by medical priority.")}>Stable</button>
        </div>
      );
    }

    if (actionCategory === "registration") {
      return (
        <div style={styles.actionGrid}>
          <button style={styles.actionButtonBlue} onClick={() => sendUpdate(visit.status, visit.petName + "'s registration information has been received.")}>Registration Complete</button>
          <button style={styles.actionButtonPurple} onClick={sendEmergencyConsentReminder}>Send Consent Reminder</button>
          <button style={styles.actionButtonOrange} onClick={() => sendOwnerUpdate("A deposit is requested to continue care for " + visit.petName + ".", "Deposit requested")}>Request Deposit</button>
        </div>
      );
    }

    if (actionCategory === "diagnostics") {
      return (
        <div style={styles.actionGrid}>
          {!doctor && (
            <select style={styles.selectAction} defaultValue="" onChange={(event) => {
              if (!event.target.value) return;
              assignDoctorToVisit(event.target.value);
              event.target.value = "";
            }}>
              <option value="">Assign Doctor</option>
              {doctors.map((doctorOption) => (
                <option key={doctorOption.name} value={doctorOption.name}>Dr. {doctorOption.name}</option>
              ))}
            </select>
          )}
          <button style={styles.actionButtonPurple} onClick={() => sendUpdate("Doctor reviewing", "The doctor is reviewing " + visit.petName + "'s history, triage notes, and symptoms.")}>Doctor Reviewing</button>
          <button style={styles.actionButtonBlue} onClick={() => sendUpdate("Diagnostics underway", "Diagnostics are underway for " + visit.petName + ".")}>Diagnostics Started</button>
          <button style={styles.actionButtonTeal} onClick={sendEstimateApproval}>Send Estimate</button>
        </div>
      );
    }

    if (actionCategory === "treatment") {
      return (
        <div style={styles.actionGrid}>
          {[
            ["Treatment started", "Treatment Started"],
            ["In surgery", "In Surgery"],
            ["Recovering from anesthesia", "Recovering"],
          ].map(([status, label]) => (
            <button key={label} style={styles.actionButtonOrange} onClick={() => sendUpdate(status, visit.petName + "'s status has been updated: " + label + ".")}>{label}</button>
          ))}
        </div>
      );
    }

    return (
      <div style={styles.actionGrid}>
        <button style={styles.actionButtonRed} onClick={() => sendUpdate("Ready for pickup", visit.petName + " is ready for pickup. Please check in at the front desk when you arrive.")}>Ready Pickup</button>
        <button style={styles.actionButtonPurple} onClick={sendDischargeInstructions}>Send Discharge</button>
        <button style={styles.actionButtonTeal} onClick={() => sendUpdate("Closed", visit.petName + "'s visit has been completed and closed.")}>Close Visit</button>
      </div>
    );
  };

  const renderAuth = () => (
    <main style={styles.screen}>
      <header style={styles.topBar}>
        <button type="button" style={styles.backButton} onClick={() => router.push("/clinic/patients")}>Back</button>
        <div style={styles.topCopy}>
          <strong>Patient record</strong>
          <span>Clinic sign in</span>
        </div>
      </header>
      <section style={styles.loginPanel}>
        <h1 style={styles.loginTitle}>Clinic Staff Login</h1>
        <p style={styles.mutedText}>Sign in to open this patient record.</p>
        <form style={styles.loginForm} onSubmit={signInClinicStaff}>
          <input style={styles.input} type="email" value={staffLoginEmail} onChange={(event) => setStaffLoginEmail(event.target.value)} placeholder="Staff email" required />
          <input style={styles.input} type="password" value={staffLoginPassword} onChange={(event) => setStaffLoginPassword(event.target.value)} placeholder="Password" required />
          <button style={styles.primaryButton} type="submit" disabled={authLoading}>{authLoading ? "Signing in..." : "Sign In"}</button>
        </form>
        {authMessage && <div style={styles.notice}>{authMessage}</div>}
        {clinicError && <div style={styles.error}>{clinicError}</div>}
      </section>
    </main>
  );

  if (!authChecked || loading) {
    return (
      <main style={styles.screen}>
        <header style={styles.topBar}>
          <button type="button" style={styles.backButton} onClick={() => router.push("/clinic/patients")}>Back</button>
          <div style={styles.topCopy}>
            <strong>Patient record</strong>
            <span>Loading...</span>
          </div>
        </header>
        <section style={styles.loadingPanel}>Loading this patient record...</section>
      </main>
    );
  }

  if (!staffProfile) return renderAuth();

  if (!visit) {
    return (
      <main style={styles.screen}>
        <header style={styles.topBar}>
          <button type="button" style={styles.backButton} onClick={() => router.push("/clinic/patients")}>Back</button>
          <div style={styles.topCopy}>
            <strong>Patient record</strong>
            <span>Not found</span>
          </div>
        </header>
        <section style={styles.loadingPanel}>
          {clinicError || "This patient record could not be found in the active clinic queue."}
        </section>
      </main>
    );
  }

  const intake = getIntakeSummary(visit);
  const doctor = getAssignedDoctorFromNotes(visit.clinicNotes);
  const actionCategory = getActionCenterCategory(visit);
  const workflowStatus = getClinicWorkflowStatusLabel(visit);
  const primaryClinicalAction = getPrimaryClinicalAction(visit, doctor);
  const compactWorkflowIndex = getCompactWorkflowIndex(visit);
  const statusChips = getStatusChips(visit, doctor);
  const consentStatus = getEmergencyConsentStatus(visit);
  const patientPhotoUrl = visit.petPhotoUrl || getPetPhotoFromNotes(visit.clinicNotes);

  return (
    <main style={styles.screen}>
      <header style={styles.topBar}>
        <button type="button" style={styles.backButton} onClick={() => router.push("/clinic/patients")}>Back</button>
        <div style={styles.topCopy}>
          <strong>{visit.petName}</strong>
          <span>Patient record</span>
        </div>
      </header>

      <section style={styles.patientHeader}>
        <div style={styles.patientHeaderTop}>
          <img
            src={patientPhotoUrl || defaultPetAvatarSrc}
            alt={patientPhotoUrl ? visit.petName : "No photo uploaded"}
            style={styles.patientAvatar}
          />
          <div style={styles.patientHeaderCopy}>
            <h1 style={styles.petName}>{visit.petName}</h1>
            <p style={styles.metaLine}>{getCompactPatientMetaLine(visit)}</p>
            {!patientPhotoUrl && <span style={styles.noPhotoLabel}>No photo uploaded</span>}
          </div>
        </div>
        <div style={styles.metaList}>
          <span><strong>Owner:</strong> {getOwnerName(visit)}</span>
          <span><strong>Doctor:</strong> {doctor ? "Dr. " + doctor.name : "Unassigned"}</span>
          <span><strong>Status:</strong> {workflowStatus}</span>
        </div>
        <div style={styles.chipRow}>
          {statusChips.map((chip) => (
            <span key={chip.label} style={{ ...styles.statusChip, ...(chip.tone === "red" ? styles.statusChipRed : {}), ...(chip.tone === "orange" ? styles.statusChipOrange : {}), ...(chip.tone === "teal" ? styles.statusChipTeal : {}), ...(chip.tone === "blue" ? styles.statusChipBlue : {}) }}>
              {chip.label}
            </span>
          ))}
        </div>
      </section>

      <section style={styles.nextAction}>
        <div>
          <span style={styles.eyebrow}>Next clinical action</span>
          <strong>{primaryClinicalAction.label}</strong>
          <p>{primaryClinicalAction.helper}</p>
        </div>
        {primaryClinicalAction.kind === "assignDoctor" ? (
          <select style={styles.primarySelect} defaultValue="" onChange={(event) => {
            if (!event.target.value) return;
            assignDoctorToVisit(event.target.value);
            event.target.value = "";
          }}>
            <option value="">Assign Doctor</option>
            {doctors.map((doctorOption) => (
              <option key={doctorOption.name} value={doctorOption.name}>Dr. {doctorOption.name}</option>
            ))}
          </select>
        ) : (
          <button style={styles.nextActionButton} type="button" onClick={() => runPrimaryClinicalAction(primaryClinicalAction)} disabled={Boolean(pendingAction)}>
            {pendingAction || primaryClinicalAction.label}
          </button>
        )}
      </section>

      <section style={styles.quickActions}>
        <a style={styles.quickAction} href={"tel:" + visit.phone}>Call</a>
        <a style={styles.quickAction} href={"sms:" + visit.phone}>Text</a>
        <a style={styles.quickAction} href={visit.ownerEmail ? "mailto:" + visit.ownerEmail : undefined}>Email</a>
        <a style={styles.quickAction} href={visit.accessUrl || "#"} target="_blank" rel="noreferrer">Owner View</a>
      </section>

      <section style={styles.consentPanel}>
        <div>
          <span style={styles.eyebrow}>Consent</span>
          <strong>{consentStatus.label}</strong>
          <p>{consentStatus.detail}</p>
        </div>
        {consentStatus.label === "Pending" && (
          <button
            type="button"
            style={styles.consentReminderButton}
            onClick={sendEmergencyConsentReminder}
            disabled={Boolean(pendingAction)}
          >
            Send Consent Reminder
          </button>
        )}
      </section>

      {pendingAction && <div style={styles.pendingNotice}>{pendingAction}</div>}

      <section style={styles.workflowPanel}>
        <div style={styles.workflowHeader}>
          <div>
            <span style={styles.eyebrow}>Continue workflow</span>
            <h2 style={styles.sectionTitle}>{getActionCenterTitle(visit)}</h2>
          </div>
          <span style={styles.stagePill}>{workflowStatus}</span>
        </div>
        <div style={styles.workflowTracker}>
          {compactWorkflowSteps.map((step, index) => {
            const complete = index < compactWorkflowIndex;
            const current = index === compactWorkflowIndex;
            return (
              <div key={step} style={styles.workflowStep}>
                <span style={{ ...styles.workflowDot, ...(complete ? styles.workflowDotComplete : {}), ...(current ? styles.workflowDotCurrent : {}) }}>{complete ? "OK" : current ? "." : ""}</span>
                <strong>{step}</strong>
              </div>
            );
          })}
        </div>
        {stageActions(actionCategory, doctor)}
      </section>

      <details style={styles.section}>
        <summary style={styles.summary}>Owner Communication</summary>
        <div style={styles.sectionBody}>
          <div style={styles.actionGrid}>
            {[
              ["Checked In", "Checked in", visit.petName + " has been checked in with the emergency team."],
              ["Doctor Reviewing", "Doctor reviewing", "The doctor is reviewing " + visit.petName + " now."],
              ["Diagnostics Running", "Diagnostics underway", "Diagnostics are underway for " + visit.petName + "."],
              ["Treatment Started", "Treatment started", "Treatment has started for " + visit.petName + "."],
              ["Recovering", "Recovering", visit.petName + " is recovering and being monitored."],
              ["Ready Pickup", "Ready for pickup", visit.petName + " is ready for pickup. Please check in at the front desk when you arrive."],
            ].map(([label, status, message]) => (
              <button key={label} style={styles.actionButton} onClick={() => sendOwnerUpdate(message, status)}>{label}</button>
            ))}
          </div>
          <textarea style={styles.textarea} value={ownerUpdateDraft} onChange={(event) => setOwnerUpdateDraft(event.target.value)} placeholder="Owner-friendly update" />
          <button style={styles.primaryButton} type="button" onClick={() => sendOwnerUpdate("There is a new update for " + visit.petName + ".")}>Send Custom Message</button>
        </div>
      </details>

      <details style={styles.section}>
        <summary style={styles.summary}>Intake Details</summary>
        <div style={styles.intakeGrid}>
          {[
            ["Age", intake.age],
            ["Weight", intake.weight],
            ["Chief Complaint", intake.chiefComplaint + " / " + intake.symptom],
            ["Duration", intake.started],
            ["Breathing", intake.breathing],
            ["Walking", intake.mobility],
            ["Medications", intake.medications],
            ["Allergies", intake.allergies],
          ].map(([label, value]) => (
            <div key={label} style={styles.intakeItem}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </details>

      <details style={styles.section}>
        <summary style={styles.summary}>Care Events</summary>
        <div style={styles.actionGrid}>
          {[
            ["Medication", "Enter medication note", visit.petName + "'s scheduled medication or treatment was completed."],
            ["Monitoring", "Enter monitoring note", visit.petName + " is resting and being monitored by the care team."],
            ["Fed", "Enter feeding note", visit.petName + "'s feeding or nursing care was completed."],
            ["Walked", "Enter walking note", visit.petName + " was walked during the latest care check."],
            ["Urinated", "Enter urination note", visit.petName + " urinated during the latest care check."],
            ["Defecated", "Enter defecation note", visit.petName + " defecated during the latest care check."],
          ].map(([label, promptTitle, fallbackMessage]) => (
            <button key={label} style={styles.actionButton} onClick={() => {
              const detail = window.prompt(promptTitle);
              sendUpdate(visit.status, detail || fallbackMessage);
            }}>{label}</button>
          ))}
        </div>
      </details>

      <details style={styles.section}>
        <summary style={styles.summary}>Forms / Approvals</summary>
        <div style={styles.sectionBody}>
          <div style={styles.actionGrid}>
            <button style={styles.actionButtonPurple} onClick={sendEmergencyConsentReminder}>Consent Reminder</button>
            <button style={styles.actionButtonTeal} onClick={sendEstimateApproval}>Estimate</button>
            <button style={styles.actionButtonBlue} onClick={sendDischargeInstructions}>Discharge</button>
          </div>
          <div style={styles.approvalGrid}>
            <span>Estimate: {visit.estimateStatus || "Not Sent"}</span>
            {visit.forms.length > 0 ? (
              visit.forms.map((form) => <span key={form.id}>{form.form_type}: {form.form_status}</span>)
            ) : (
              <span>Forms: Not Sent</span>
            )}
          </div>
        </div>
      </details>
    </main>
  );
}

const actionButtonBase: React.CSSProperties = {
  border: "1px solid #dcefeb",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 900,
  minHeight: 38,
  padding: "8px 9px",
  textAlign: "center",
};

const styles: Record<string, React.CSSProperties> = {
  screen: {
    background: "#ffffff",
    color: "#243447",
    fontFamily: "Arial, sans-serif",
    height: "100dvh",
    overflowY: "auto",
    overscrollBehavior: "contain",
    padding: 0,
  },
  topBar: {
    alignItems: "center",
    background: "#ffffff",
    borderBottom: "1px solid #e6eef0",
    display: "flex",
    gap: 10,
    padding: "10px 12px",
  },
  backButton: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 999,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    padding: "9px 12px",
  },
  topCopy: {
    color: "#102a3a",
    display: "grid",
    fontSize: 12,
    gap: 1,
    lineHeight: 1.2,
  },
  loadingPanel: {
    padding: 16,
  },
  loginPanel: {
    display: "grid",
    gap: 12,
    padding: 16,
  },
  loginTitle: {
    color: "#102a3a",
    fontSize: 24,
    margin: 0,
  },
  loginForm: {
    display: "grid",
    gap: 10,
  },
  input: {
    border: "1px solid #cfe0df",
    borderRadius: 8,
    fontSize: 16,
    minHeight: 44,
    padding: "0 12px",
  },
  patientHeader: {
    borderBottom: "1px solid #e6eef0",
    display: "grid",
    gap: 9,
    padding: "12px",
  },
  patientHeaderTop: {
    alignItems: "center",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "58px minmax(0, 1fr)",
  },
  patientAvatar: {
    background: "#cff4ec",
    border: "3px solid #e7fbf7",
    borderRadius: "50%",
    height: 58,
    objectFit: "cover",
    width: 58,
  },
  patientHeaderCopy: {
    display: "grid",
    gap: 4,
    minWidth: 0,
  },
  petName: {
    color: "#102a3a",
    fontSize: 28,
    lineHeight: 1,
    margin: 0,
  },
  metaLine: {
    color: "#52606d",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.25,
    margin: 0,
  },
  noPhotoLabel: {
    color: "#087f78",
    fontSize: 11,
    fontWeight: 900,
  },
  metaList: {
    color: "#52606d",
    display: "grid",
    fontSize: 13,
    gap: 4,
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  statusChip: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 999,
    color: "#52606d",
    fontSize: 11,
    fontWeight: 900,
    padding: "5px 8px",
  },
  statusChipTeal: { background: "#e6f7f5", borderColor: "#bfe9e0", color: "#087f78" },
  statusChipOrange: { background: "#fff8f1", borderColor: "#fed7c2", color: "#c2410c" },
  statusChipRed: { background: "#fff1f2", borderColor: "#fecdd3", color: "#be123c" },
  statusChipBlue: { background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8" },
  nextAction: {
    alignItems: "center",
    background: "#087f78",
    color: "#ffffff",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(0, 1fr) minmax(112px, auto)",
    padding: "12px",
  },
  eyebrow: {
    display: "block",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  nextActionButton: {
    background: "#ffffff",
    border: "none",
    borderRadius: 8,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 38,
    padding: "0 10px",
  },
  primarySelect: {
    background: "#ffffff",
    border: "none",
    borderRadius: 8,
    color: "#087f78",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 38,
    padding: "0 8px",
  },
  quickActions: {
    borderBottom: "1px solid #e6eef0",
    display: "grid",
    gap: 6,
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    padding: "8px 12px",
  },
  quickAction: {
    alignItems: "center",
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    display: "flex",
    fontSize: 12,
    fontWeight: 900,
    justifyContent: "center",
    minHeight: 38,
    textDecoration: "none",
  },
  consentPanel: {
    alignItems: "center",
    background: "#fff7ed",
    borderBottom: "1px solid #fed7aa",
    color: "#102a3a",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(0, 1fr) auto",
    padding: "10px 12px",
  },
  consentReminderButton: {
    background: "#ffffff",
    border: "1px solid #fed7aa",
    borderRadius: 8,
    color: "#c2410c",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 38,
    padding: "0 10px",
  },
  workflowPanel: {
    background: "#f8fbff",
    borderBottom: "1px solid #e6eef0",
    display: "grid",
    gap: 10,
    padding: "12px",
  },
  workflowHeader: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#102a3a",
    fontSize: 16,
    fontWeight: 900,
    margin: 0,
  },
  stagePill: {
    background: "#e8f2ff",
    borderRadius: 8,
    color: "#2457a6",
    fontSize: 12,
    fontWeight: 900,
    padding: "6px 9px",
  },
  workflowTracker: {
    display: "grid",
    gap: 5,
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  },
  workflowStep: {
    alignItems: "center",
    color: "#52606d",
    display: "grid",
    fontSize: 10,
    fontWeight: 900,
    gap: 5,
    justifyItems: "center",
    lineHeight: 1.05,
    textAlign: "center",
  },
  workflowDot: {
    background: "#ffffff",
    border: "2px solid #dbe5e8",
    borderRadius: "50%",
    color: "#ffffff",
    display: "grid",
    fontSize: 10,
    fontWeight: 900,
    height: 24,
    placeItems: "center",
    width: 24,
  },
  workflowDotComplete: { background: "#087f78", borderColor: "#087f78" },
  workflowDotCurrent: { background: "#14b8a6", borderColor: "#14b8a6" },
  actionGrid: {
    display: "grid",
    gap: 7,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 118px), 1fr))",
  },
  actionButton: { ...actionButtonBase, background: "#f8fbff", color: "#102a3a" },
  actionButtonBlue: { ...actionButtonBase, background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8" },
  actionButtonPurple: { ...actionButtonBase, background: "#faf5ff", borderColor: "#e9d5ff", color: "#7e22ce" },
  actionButtonOrange: { ...actionButtonBase, background: "#fff7ed", borderColor: "#fed7aa", color: "#c2410c" },
  actionButtonRed: { ...actionButtonBase, background: "#fff1f2", borderColor: "#fecdd3", color: "#be123c" },
  actionButtonTeal: { ...actionButtonBase, background: "#ecfdf5", borderColor: "#bbf7d0", color: "#047857" },
  selectAction: {
    background: "#faf5ff",
    border: "1px solid #e9d5ff",
    borderRadius: 8,
    color: "#7e22ce",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 38,
    padding: "0 9px",
  },
  section: {
    background: "#ffffff",
    borderBottom: "1px solid #e6eef0",
  },
  summary: {
    color: "#102a3a",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 900,
    padding: "12px",
  },
  sectionBody: {
    display: "grid",
    gap: 10,
    padding: "0 12px 12px",
  },
  textarea: {
    border: "1px solid #cfe0df",
    borderRadius: 8,
    fontSize: 14,
    minHeight: 76,
    padding: 11,
    width: "100%",
  },
  intakeGrid: {
    display: "grid",
    gap: 6,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
    padding: "0 12px 12px",
  },
  intakeItem: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#64717d",
    display: "grid",
    fontSize: 11,
    fontWeight: 800,
    gap: 2,
    padding: "7px 8px",
  },
  approvalGrid: {
    color: "#52606d",
    display: "grid",
    fontSize: 12,
    fontWeight: 800,
    gap: 4,
  },
  primaryButton: {
    background: "#087f78",
    border: "none",
    borderRadius: 8,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    minHeight: 42,
    padding: "0 14px",
  },
  pendingNotice: {
    background: "#fff8f1",
    borderBottom: "1px solid #fed7c2",
    color: "#9a3412",
    fontSize: 13,
    fontWeight: 900,
    padding: "10px 12px",
  },
  mutedText: {
    color: "#52606d",
    margin: 0,
  },
  notice: {
    background: "#e6f7f5",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    padding: 10,
  },
  error: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 8,
    color: "#be123c",
    padding: 10,
  },
};
