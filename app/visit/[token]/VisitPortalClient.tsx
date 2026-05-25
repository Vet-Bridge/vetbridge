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
  breed: string;
  ownerFirstName: string;
  ownerLastName: string;
  visitType: string;
  status: string;
  updates: OwnerPortalUpdate[];
  forms: OwnerPortalForm[];
  petPhotoUrl: string;
};

type OwnerEstimate = {
  id: string;
  visitId: string;
  title: string;
  amount: number;
  description: string;
  status: string;
  approvedAt: string;
  declinedAt: string;
  discussionRequestedAt: string;
  notes: string;
  responseNotes: string;
  ownerName: string;
  createdAt: string;
};

type EstimateWorkflowResponse = {
  estimateWorkflow: {
    setupRequired?: boolean;
    estimates: OwnerEstimate[];
  };
};

type EstimateResponseDraft = {
  ownerName: string;
  notes: string;
};

type ClinicFormDraft = {
  ownerName: string;
  relationship: string;
  authorized: boolean;
  signature: string;
  declineReason: string;
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

const visitSteps = ["Received", "Triage", "Doctor", "Treatment", "Discharge"];

const getVisitStepIndex = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (
    normalizedStatus.includes("discharged") ||
    normalizedStatus.includes("closed") ||
    normalizedStatus.includes("pickup")
  ) {
    return 4;
  }

  if (
    normalizedStatus.includes("treatment") ||
    normalizedStatus.includes("surgery") ||
    normalizedStatus.includes("recover") ||
    normalizedStatus.includes("icu") ||
    normalizedStatus.includes("observation") ||
    normalizedStatus.includes("stable") ||
    normalizedStatus.includes("critical")
  ) {
    return 3;
  }

  if (normalizedStatus.includes("doctor") || normalizedStatus.includes("diagnostic")) {
    return 2;
  }

  if (
    normalizedStatus.includes("triage") ||
    normalizedStatus.includes("checked in") ||
    normalizedStatus.includes("stabil")
  ) {
    return 1;
  }

  return 0;
};

const isDischargeRelated = (value: string) =>
  value.toLowerCase().includes("discharge") ||
  value.toLowerCase().includes("medication") ||
  value.toLowerCase().includes("follow-up");

const isEmergencyCareConsentForm = (form: OwnerPortalForm) =>
  form.form_type.toLowerCase() === "emergency care consent";

const emptyClinicFormDraft = (): ClinicFormDraft => ({
  ownerName: "",
  relationship: "",
  authorized: false,
  signature: "",
  declineReason: "",
});

export default function VisitPortalClient({ token, initialVisit }: VisitPortalClientProps) {
  const [visit, setVisit] = useState(initialVisit);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("Connecting");
  const [syncStatus, setSyncStatus] = useState("Live updates are connecting.");
  const [lastSynced, setLastSynced] = useState("");
  const [estimates, setEstimates] = useState<OwnerEstimate[]>([]);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateMessage, setEstimateMessage] = useState("");
  const [estimateDrafts, setEstimateDrafts] = useState<Record<string, EstimateResponseDraft>>({});
  const [clinicFormDrafts, setClinicFormDrafts] = useState<Record<string, ClinicFormDraft>>({});
  const [selectedClinicFormId, setSelectedClinicFormId] = useState<string | null>(null);
  const [respondingFormId, setRespondingFormId] = useState("");
  const [formActionMessage, setFormActionMessage] = useState("");
  const [respondingEstimateId, setRespondingEstimateId] = useState("");

  const latestUpdate = useMemo(
    () => visit.updates[visit.updates.length - 1],
    [visit.updates]
  );
  const selectedClinicForm = useMemo(
    () => visit.forms.find((form) => form.id === selectedClinicFormId) || null,
    [selectedClinicFormId, visit.forms]
  );
  const pendingEstimateCount = estimates.filter(
    (estimate) => estimate.status === "Pending Owner Review"
  ).length;
  const pendingClinicForms = visit.forms.filter((form) => form.form_status === "Sent");
  const pendingEmergencyConsent = pendingClinicForms.find(isEmergencyCareConsentForm) || null;
  const pendingOtherClinicForms = pendingClinicForms.filter(
    (form) => form.id !== pendingEmergencyConsent?.id
  );
  const completedClinicForms = visit.forms.filter((form) => form.form_status !== "Sent");
  const currentStepIndex = getVisitStepIndex(visit.status);
  const dischargeClinicForms = visit.forms.filter((form) =>
    isDischargeRelated(`${form.form_type} ${form.form_body || ""}`)
  );
  const hasDischargeDocuments = dischargeClinicForms.length > 0;
  const needsAttentionCount =
    pendingEstimateCount + pendingClinicForms.length + (hasDischargeDocuments ? 1 : 0);
  const visitStartedLabel = visit.createdAt
    ? new Date(visit.createdAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "In progress";

  const jumpToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

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

  const loadEstimates = useCallback(
    async (source: "manual" | "background" = "background") => {
      if (source === "manual") setEstimateMessage("Refreshing estimates.");
      setEstimateLoading(true);

      try {
        const response = await fetch("/api/mypawlink", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "loadEstimatesByToken",
            token,
          }),
        });

        const result = (await response.json().catch(() => null)) as
          | (EstimateWorkflowResponse & { error?: string })
          | null;

        if (!response.ok || !result?.estimateWorkflow) {
          throw new Error(result?.error || "Unable to load estimates.");
        }

        setEstimates(result.estimateWorkflow.estimates);
        setEstimateMessage(
          result.estimateWorkflow.setupRequired
            ? "Estimate workflow is ready in the app. Run the Phase 7 SQL to save estimates."
            : ""
        );
      } catch (error) {
        console.error(error);
        setEstimateMessage(
          error instanceof Error ? error.message : "Unable to load treatment estimates."
        );
      } finally {
        setEstimateLoading(false);
      }
    },
    [token]
  );

  const updateEstimateDraft = (
    estimateId: string,
    field: keyof EstimateResponseDraft,
    value: string
  ) => {
    setEstimateDrafts((current) => ({
      ...current,
      [estimateId]: {
        ownerName: current[estimateId]?.ownerName || "",
        notes: current[estimateId]?.notes || "",
        [field]: value,
      },
    }));
  };

  const respondToEstimate = async (
    estimate: OwnerEstimate,
    response: "approved" | "declined" | "discussion"
  ) => {
    const draft = estimateDrafts[estimate.id] || { ownerName: "", notes: "" };

    if (!draft.ownerName.trim()) {
      setEstimateMessage("Please enter your printed name before responding.");
      return;
    }

    setRespondingEstimateId(estimate.id);
    setEstimateMessage("");

    try {
      const apiResponse = await fetch("/api/mypawlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "respondEstimate",
          token,
          estimateId: estimate.id,
          response,
          ownerName: draft.ownerName.trim(),
          responseNotes: draft.notes.trim(),
        }),
      });

      const result = (await apiResponse.json().catch(() => null)) as
        | (EstimateWorkflowResponse & { error?: string })
        | null;

      if (!apiResponse.ok || !result?.estimateWorkflow) {
        throw new Error(result?.error || "Unable to respond to estimate.");
      }

      setEstimates(result.estimateWorkflow.estimates);
      setEstimateMessage(
        response === "approved"
          ? "Estimate approved. The clinic has been notified."
          : response === "declined"
            ? "Estimate declined. The clinic has been notified."
            : "Discussion requested. The clinic has been notified."
      );
      setEstimateDrafts((current) => ({
        ...current,
        [estimate.id]: { ownerName: "", notes: "" },
      }));
    } catch (error) {
      console.error(error);
      setEstimateMessage(
        error instanceof Error ? error.message : "Unable to respond to estimate."
      );
    } finally {
      setRespondingEstimateId("");
    }
  };

  const updateClinicFormDraft = (
    formId: string,
    field: keyof ClinicFormDraft,
    value: string | boolean
  ) => {
    setClinicFormDrafts((current) => ({
      ...current,
      [formId]: {
        ...(current[formId] || emptyClinicFormDraft()),
        [field]: value,
      },
    }));
  };

  const openClinicForm = (formId: string) => {
    setSelectedClinicFormId(formId);
    setClinicFormDrafts((current) => ({
      ...current,
      [formId]: current[formId] || emptyClinicFormDraft(),
    }));
    setFormActionMessage("");
  };

  const respondToClinicForm = async (
    form: OwnerPortalForm,
    formStatus: "Signed" | "Declined"
  ) => {
    const draft = clinicFormDrafts[form.id] || emptyClinicFormDraft();

    if (formStatus === "Signed") {
      if (!draft.ownerName.trim() || !draft.relationship.trim() || !draft.signature.trim()) {
        setFormActionMessage("Please complete owner name, relationship, and typed signature.");
        return;
      }
      if (isEmergencyCareConsentForm(form) && !draft.authorized) {
        setFormActionMessage("Please check the authorization box before signing.");
        return;
      }
    }

    if (formStatus === "Declined" && !draft.declineReason.trim()) {
      setFormActionMessage("Please enter a brief reason before declining.");
      return;
    }

    setRespondingFormId(form.id);
    setFormActionMessage("");

    try {
      const response = await fetch("/api/mypawlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "respondForm",
          token,
          formId: form.id,
          formStatus,
          signedName:
            formStatus === "Signed"
              ? draft.ownerName.trim() + " (" + draft.relationship.trim() + ")"
              : "",
          declineReason: draft.declineReason.trim(),
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; visit?: OwnerPortalVisit; error?: string }
        | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Unable to submit this response.");
      }

      if (result.visit) setVisit(result.visit);
      setSelectedClinicFormId(null);
      setClinicFormDrafts((current) => ({
        ...current,
        [form.id]: emptyClinicFormDraft(),
      }));
      setFormActionMessage(
        formStatus === "Signed"
          ? form.form_type + " signed. The clinic has been notified."
          : "The veterinary team may contact you before care can continue."
      );
      void refreshVisit("background");
    } catch (error) {
      console.error(error);
      setFormActionMessage(
        error instanceof Error ? error.message : "Unable to submit this response."
      );
    } finally {
      setRespondingFormId("");
    }
  };

  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel(`visit-access:${token}`)
      .on("broadcast", { event: "visit-updated" }, () => {
        if (!active) return;
        void refreshVisit("live");
        void loadEstimates("background");
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
  }, [loadEstimates, refreshVisit, token]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadEstimates("background");
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadEstimates]);

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

        <section style={styles.ownerOverviewCard}>
          <div style={styles.ownerOverviewHeader}>
            <div>
              <p style={styles.eyebrow}>Visit overview</p>
              <h2 style={styles.overviewTitle}>{visit.petName}</h2>
              <p style={styles.text}>
                {[visit.breed || visit.species, visit.visitType || "Emergency visit"]
                  .filter(Boolean)
                  .join(" - ")}
              </p>
            </div>
            <span
              style={{
                ...styles.attentionBadge,
                ...(needsAttentionCount > 0 ? styles.attentionBadgeActive : {}),
              }}
            >
              {needsAttentionCount > 0 ? `${needsAttentionCount} needs review` : "No action needed"}
            </span>
          </div>

          <div style={styles.ownerMetricGrid}>
            <div style={styles.ownerMetric}>
              <span>Started</span>
              <strong>{visitStartedLabel}</strong>
            </div>
            <div style={styles.ownerMetric}>
              <span>Latest</span>
              <strong>{latestUpdate?.time || "Waiting"}</strong>
            </div>
            <div style={styles.ownerMetric}>
              <span>Forms</span>
              <strong>{pendingClinicForms.length} pending</strong>
            </div>
            <div style={styles.ownerMetric}>
              <span>Estimates</span>
              <strong>{pendingEstimateCount} pending</strong>
            </div>
          </div>

          <div style={styles.ownerProgressRail}>
            {visitSteps.map((step, index) => (
              <div key={step} style={styles.ownerProgressStep}>
                <span
                  style={{
                    ...styles.ownerProgressDot,
                    ...(index <= currentStepIndex ? styles.ownerProgressDotActive : {}),
                  }}
                />
                <small>{step}</small>
              </div>
            ))}
          </div>

          <div style={styles.quickActionGrid}>
            <button type="button" style={styles.quickActionButton} onClick={() => jumpToSection("timeline")}>
              Updates
            </button>
            <button type="button" style={styles.quickActionButton} onClick={() => jumpToSection("actions")}>
              Actions
            </button>
            <button type="button" style={styles.quickActionButton} onClick={() => jumpToSection("estimates")}>
              Estimates
            </button>
            <button type="button" style={styles.quickActionButton} onClick={() => jumpToSection("discharge")}>
              Discharge
            </button>
          </div>
        </section>

        <div style={styles.grid}>
          <section id="timeline" style={styles.card}>
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

          <section id="actions" style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Actions</h2>
                <p style={styles.text}>Forms, estimates, and discharge documents appear here only when your review is needed.</p>
              </div>
              <span style={styles.timelineCount}>
                {needsAttentionCount > 0 ? needsAttentionCount + " pending" : "Clear"}
              </span>
            </div>

            {formActionMessage && <div style={styles.careHubNotice}>{formActionMessage}</div>}

            {!selectedClinicForm && (
              <div style={styles.actionStack}>
                {pendingEmergencyConsent && (
                  <div style={styles.actionNeededCard}>
                    <span style={styles.actionEyebrow}>Action Needed</span>
                    <strong>Emergency Care Consent</strong>
                    <p>Please review and sign so the veterinary team can begin care.</p>
                    <button
                      type="button"
                      style={styles.signButton}
                      onClick={() => openClinicForm(pendingEmergencyConsent.id)}
                    >
                      Review & Sign
                    </button>
                  </div>
                )}

                {pendingOtherClinicForms.map((form) => (
                  <div key={form.id} style={styles.actionNeededCard}>
                    <span style={styles.actionEyebrow}>Action Needed</span>
                    <strong>{form.form_type || "Form"}</strong>
                    <p>{form.form_body || "Please review and respond to this form."}</p>
                    <button type="button" style={styles.signButton} onClick={() => openClinicForm(form.id)}>
                      Review & Sign
                    </button>
                  </div>
                ))}

                {pendingEstimateCount > 0 && (
                  <div style={styles.actionInfoCard}>
                    <span style={styles.actionEyebrow}>Estimate Approval Needed</span>
                    <strong>Please review and approve or decline the treatment estimate.</strong>
                    <button type="button" style={styles.secondaryActionButton} onClick={() => jumpToSection("estimates")}>
                      Review Estimate
                    </button>
                  </div>
                )}

                {hasDischargeDocuments && (
                  <div style={styles.actionInfoCard}>
                    <span style={styles.actionEyebrow}>Discharge Instructions Available</span>
                    <strong>Discharge documents are ready for this visit.</strong>
                    <button type="button" style={styles.secondaryActionButton} onClick={() => jumpToSection("discharge")}>
                      View Discharge Instructions
                    </button>
                  </div>
                )}

                {pendingClinicForms.length === 0 && pendingEstimateCount === 0 && !hasDischargeDocuments && (
                  <div style={styles.emptyBox}>
                    <strong>No action needed right now.</strong>
                    <span>We will let you know here when something needs your review.</span>
                  </div>
                )}
              </div>
            )}

            {selectedClinicForm && (
              <div style={styles.consentShell}>
                <button type="button" style={styles.backButton} onClick={() => setSelectedClinicFormId(null)}>
                  Back to Actions
                </button>
                <span style={styles.formStatus}>{selectedClinicForm.form_status || "Pending"}</span>
                <h3 style={styles.careHubTitle}>{selectedClinicForm.form_type || "Form"}</h3>
                <div style={styles.legalBox}>
                  {(selectedClinicForm.form_body || "Please review this form before responding.")
                    .split("\n\n")
                    .map((paragraph) => (
                      <p key={paragraph} style={styles.legalText}>
                        {paragraph}
                      </p>
                    ))}
                </div>

                <form style={styles.signatureForm} onSubmit={(event) => event.preventDefault()}>
                  <input
                    style={styles.input}
                    value={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).ownerName}
                    onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "ownerName", event.target.value)}
                    placeholder="Owner full name"
                    autoComplete="name"
                  />
                  <input
                    style={styles.input}
                    value={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).relationship}
                    onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "relationship", event.target.value)}
                    placeholder="Relationship to pet"
                  />
                  {isEmergencyCareConsentForm(selectedClinicForm) && (
                    <label style={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).authorized}
                        onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "authorized", event.target.checked)}
                      />
                      I authorize initial emergency evaluation and care.
                    </label>
                  )}
                  <input
                    style={styles.input}
                    value={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).signature}
                    onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "signature", event.target.value)}
                    placeholder="Typed signature"
                  />
                  <div style={styles.timestampBox}>Date/time: {new Date().toLocaleString()}</div>
                  <button
                    type="button"
                    style={{ ...styles.signButton, ...(respondingFormId ? styles.disabledButton : {}) }}
                    disabled={Boolean(respondingFormId)}
                    onClick={() => void respondToClinicForm(selectedClinicForm, "Signed")}
                  >
                    {respondingFormId === selectedClinicForm.id ? "Submitting..." : "Sign Consent"}
                  </button>
                  <textarea
                    style={styles.estimateNotes}
                    value={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).declineReason}
                    onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "declineReason", event.target.value)}
                    placeholder="Reason for declining"
                  />
                  <div style={styles.warningBox}>The veterinary team may contact you before care can continue.</div>
                  <button
                    type="button"
                    style={styles.declineButton}
                    disabled={Boolean(respondingFormId)}
                    onClick={() => void respondToClinicForm(selectedClinicForm, "Declined")}
                  >
                    Decline
                  </button>
                </form>
              </div>
            )}
          </section>

          <section id="care-hub" style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Care Hub</h2>
                <p style={styles.text}>Only documents connected to this visit appear here.</p>
              </div>
            </div>
            <div style={styles.formList}>
              {completedClinicForms.length > 0 ? (
                completedClinicForms.map((form) => (
                  <div key={form.id} style={styles.formCard}>
                    <div>
                      <strong>{form.form_type || "Document"}</strong>
                      <p style={styles.formText}>{form.form_body || "Visit document."}</p>
                    </div>
                    <span
                      style={{
                        ...styles.formStatus,
                        ...(form.form_status === "Signed" ? styles.formStatusSigned : {}),
                      }}
                    >
                      {form.form_status || "Pending"}
                    </span>
                  </div>
                ))
              ) : (
                <div style={styles.emptyBox}>No visit documents are available yet.</div>
              )}
            </div>
          </section>

          <section id="estimates" style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Treatment Estimates</h2>
                <p style={styles.text}>Review estimates and tell the clinic how to proceed.</p>
              </div>
              <span style={styles.timelineCount}>
                {pendingEstimateCount} pending
              </span>
            </div>

            {estimateMessage && <div style={styles.careHubNotice}>{estimateMessage}</div>}
            {estimateLoading && <div style={styles.emptyBox}>Loading estimates...</div>}

            {!estimateLoading && estimates.length === 0 && (
              <div style={styles.emptyBox}>No treatment estimates are ready right now.</div>
            )}

            <div style={styles.estimateList}>
              {estimates.map((estimate) => {
                const draft = estimateDrafts[estimate.id] || { ownerName: "", notes: "" };
                const isPending = estimate.status === "Pending Owner Review";
                const isResponding = respondingEstimateId === estimate.id;

                return (
                  <div key={estimate.id} style={styles.estimateCard}>
                    <div style={styles.estimateHeader}>
                      <div>
                        <h3 style={styles.estimateTitle}>{estimate.title}</h3>
                        <p style={styles.formText}>{estimate.description}</p>
                      </div>
                      <span
                        style={{
                          ...styles.formStatus,
                          ...(estimate.status === "Approved" ? styles.formStatusSigned : {}),
                        }}
                      >
                        {estimate.status}
                      </span>
                    </div>

                    <div style={styles.estimateAmount}>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: estimate.amount % 1 === 0 ? 0 : 2,
                      }).format(estimate.amount)}
                    </div>

                    {isPending ? (
                      <div style={styles.estimateResponseBox}>
                        <input
                          style={styles.input}
                          value={draft.ownerName}
                          onChange={(event) =>
                            updateEstimateDraft(estimate.id, "ownerName", event.target.value)
                          }
                          placeholder="Printed name"
                        />
                        <textarea
                          style={styles.estimateNotes}
                          value={draft.notes}
                          onChange={(event) =>
                            updateEstimateDraft(estimate.id, "notes", event.target.value)
                          }
                          placeholder="Optional note or question"
                        />
                        <div style={styles.estimateButtonGrid}>
                          <button
                            type="button"
                            style={styles.approveButton}
                            disabled={isResponding}
                            onClick={() => void respondToEstimate(estimate, "approved")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            style={styles.discussButton}
                            disabled={isResponding}
                            onClick={() => void respondToEstimate(estimate, "discussion")}
                          >
                            Request Discussion
                          </button>
                          <button
                            type="button"
                            style={styles.declineButton}
                            disabled={isResponding}
                            onClick={() => void respondToEstimate(estimate, "declined")}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.estimateResponseSummary}>
                        <strong>
                          {estimate.ownerName || "Owner"} responded: {estimate.status}
                        </strong>
                        {estimate.responseNotes && <span>{estimate.responseNotes}</span>}
                        {(estimate.approvedAt ||
                          estimate.declinedAt ||
                          estimate.discussionRequestedAt) && (
                          <span>
                            {new Date(
                              estimate.approvedAt ||
                                estimate.declinedAt ||
                                estimate.discussionRequestedAt
                            ).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section id="discharge" style={styles.card}>
            <h2 style={styles.sectionTitle}>Discharge Documents</h2>
            <p style={styles.text}>
              Discharge instructions, medication acknowledgments, and follow-up care will appear
              here when ready.
            </p>
            <div style={styles.dischargeList}>
              {dischargeClinicForms.map((form) => (
                <div key={form.id} style={styles.dischargeItem}>
                  <strong>{form.form_type || "Discharge document"}</strong>
                  <span>{form.form_status || "Pending"}</span>
                </div>
              ))}
              {dischargeClinicForms.length === 0 && (
                <div style={styles.emptyBox}>No discharge documents are ready yet.</div>
              )}
            </div>
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
  ownerOverviewCard: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(41, 64, 83, 0.08)",
    display: "grid",
    gap: 14,
    marginBottom: 14,
    padding: 16,
  },
  ownerOverviewHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  overviewTitle: {
    color: "#102a3a",
    fontSize: 21,
    lineHeight: 1.15,
    margin: "0 0 5px",
  },
  attentionBadge: {
    background: "#ecfdf3",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    color: "#027a48",
    fontSize: 11,
    fontWeight: 900,
    padding: "6px 8px",
    whiteSpace: "nowrap",
  },
  attentionBadgeActive: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#c2410c",
  },
  ownerMetricGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  ownerMetric: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 3,
    padding: 10,
  },
  ownerProgressRail: {
    display: "grid",
    gap: 6,
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  },
  ownerProgressStep: {
    color: "#64717d",
    display: "grid",
    fontSize: 10,
    fontWeight: 800,
    gap: 5,
    justifyItems: "center",
    textAlign: "center",
  },
  ownerProgressDot: {
    background: "#e2e8f0",
    border: "3px solid #f8fbff",
    borderRadius: "50%",
    height: 18,
    width: 18,
  },
  ownerProgressDotActive: {
    background: "#14b8a6",
    boxShadow: "0 0 0 3px #d9fbf4",
  },
  quickActionGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  quickActionButton: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 38,
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
  actionStack: {
    display: "grid",
    gap: 10,
    marginTop: 12,
  },
  actionNeededCard: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 8,
    color: "#102a3a",
    display: "grid",
    gap: 8,
    padding: 12,
  },
  actionInfoCard: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#102a3a",
    display: "grid",
    gap: 8,
    padding: 12,
  },
  actionEyebrow: {
    color: "#c2410c",
    fontSize: 11,
    fontWeight: 950,
    textTransform: "uppercase",
  },
  secondaryActionButton: {
    background: "#ffffff",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    minHeight: 42,
    padding: "10px 12px",
  },
  warningBox: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 8,
    color: "#9a3412",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.35,
    padding: 10,
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
  formStatusSigned: {
    background: "#ecfdf3",
    color: "#027a48",
    border: "1px solid #bbf7d0",
  },
  careHubNotice: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.35,
    margin: "12px 0",
    padding: 10,
  },
  categoryGrid: {
    display: "grid",
    gap: 10,
    marginTop: 12,
  },
  categoryCard: {
    background: "linear-gradient(135deg, #fbffff, #f2fbfa)",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    cursor: "pointer",
    display: "grid",
    gap: 5,
    padding: 14,
    textAlign: "left",
  },
  categoryTitle: {
    color: "#102a3a",
    fontSize: 15,
    fontWeight: 900,
  },
  categoryText: {
    color: "#52606d",
    fontSize: 13,
    lineHeight: 1.35,
  },
  categoryMeta: {
    color: "#087f78",
    fontSize: 12,
    fontWeight: 900,
  },
  careHubStack: {
    display: "grid",
    gap: 10,
    marginTop: 12,
  },
  backButton: {
    justifySelf: "start",
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    padding: "8px 10px",
  },
  careHubHeaderBox: {
    background: "#f8fbff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    padding: 12,
  },
  careHubTitle: {
    color: "#102a3a",
    fontSize: 17,
    fontWeight: 900,
    margin: "0 0 6px",
  },
  careHubFormCard: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    display: "grid",
    gap: 12,
    padding: 12,
  },
  formTitleRow: {
    alignItems: "flex-start",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  viewFormButton: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    padding: "10px 12px",
    width: "100%",
  },
  consentShell: {
    background: "#fbffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 12,
    padding: 12,
  },
  legalBox: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    padding: 12,
  },
  legalText: {
    color: "#243447",
    fontSize: 14,
    lineHeight: 1.5,
    margin: "0 0 10px",
  },
  signatureForm: {
    display: "grid",
    gap: 10,
  },
  input: {
    border: "1px solid #cfe0df",
    borderRadius: 8,
    color: "#102a3a",
    fontSize: 15,
    minHeight: 46,
    padding: "11px 12px",
    width: "100%",
  },
  checkRow: {
    alignItems: "flex-start",
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#243447",
    display: "flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 10,
    lineHeight: 1.35,
    padding: 12,
  },
  signaturePadShell: {
    background: "#ffffff",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    display: "grid",
    gap: 8,
    padding: 10,
  },
  signatureHintRow: {
    alignItems: "center",
    color: "#52606d",
    display: "flex",
    fontSize: 12,
    fontWeight: 900,
    justifyContent: "space-between",
  },
  clearSignatureButton: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 8,
    color: "#c2410c",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    padding: "6px 9px",
  },
  signatureCanvas: {
    background: "#fbffff",
    border: "1px dashed #9ccbc6",
    borderRadius: 8,
    display: "block",
    height: 170,
    touchAction: "none",
    width: "100%",
  },
  signatureHelper: {
    color: "#64717d",
    fontSize: 12,
    fontWeight: 800,
  },
  timestampBox: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#52606d",
    fontSize: 12,
    fontWeight: 800,
    padding: 10,
  },
  signButton: {
    background: "linear-gradient(135deg, #13a89e, #0f766e)",
    border: "none",
    borderRadius: 8,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    minHeight: 48,
    padding: "12px 14px",
  },
  disabledButton: {
    cursor: "not-allowed",
    opacity: 0.62,
  },
  signedBox: {
    background: "#ecfdf3",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    color: "#027a48",
    display: "grid",
    fontSize: 14,
    gap: 5,
    padding: 12,
  },
  estimateList: {
    display: "grid",
    gap: 12,
    marginTop: 12,
  },
  estimateCard: {
    background: "#fbffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 12,
    padding: 12,
  },
  estimateHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  estimateTitle: {
    color: "#102a3a",
    fontSize: 16,
    fontWeight: 900,
    margin: "0 0 5px",
  },
  estimateAmount: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    color: "#0f766e",
    fontSize: 24,
    fontWeight: 950,
    padding: "12px 14px",
  },
  estimateResponseBox: {
    display: "grid",
    gap: 10,
  },
  estimateNotes: {
    border: "1px solid #cfe0df",
    borderRadius: 8,
    color: "#102a3a",
    fontFamily: "inherit",
    fontSize: 14,
    minHeight: 74,
    padding: "11px 12px",
    resize: "vertical",
    width: "100%",
  },
  estimateButtonGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "1fr",
  },
  approveButton: {
    background: "linear-gradient(135deg, #13a89e, #0f766e)",
    border: "none",
    borderRadius: 8,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    minHeight: 44,
    padding: "10px 12px",
  },
  discussButton: {
    background: "#f8fbff",
    border: "1px solid #9cc5f8",
    borderRadius: 8,
    color: "#2457a6",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    minHeight: 44,
    padding: "10px 12px",
  },
  declineButton: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 8,
    color: "#be123c",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    minHeight: 44,
    padding: "10px 12px",
  },
  estimateResponseSummary: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    color: "#52606d",
    display: "grid",
    fontSize: 13,
    gap: 5,
    lineHeight: 1.35,
    padding: 12,
  },
  dischargeList: {
    display: "grid",
    gap: 10,
    marginTop: 12,
  },
  dischargeItem: {
    background: "#fbffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#102a3a",
    display: "flex",
    fontSize: 13,
    gap: 10,
    justifyContent: "space-between",
    padding: 12,
  },
  dischargeItemButton: {
    background: "#fbffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#102a3a",
    cursor: "pointer",
    display: "flex",
    fontSize: 13,
    gap: 10,
    justifyContent: "space-between",
    padding: 12,
    textAlign: "left",
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
