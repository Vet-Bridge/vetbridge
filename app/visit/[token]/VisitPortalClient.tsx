"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
} from "react";
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

export type OwnerPortalSecondaryContact = {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  permissionLevel: string;
};

export type OwnerPortalPrimaryContact = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export type OwnerPortalPetAge = {
  ageValue: string;
  ageUnit: string;
  birthdate: string;
  ageUnknown: boolean;
  display: string;
};

export type OwnerPortalVisit = {
  id: string;
  createdAt: string;
  petName: string;
  species: string;
  breed: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  phone: string;
  visitType: string;
  status: string;
  reason: string;
  updates: OwnerPortalUpdate[];
  forms: OwnerPortalForm[];
  petPhotoUrl: string;
  primaryContact: OwnerPortalPrimaryContact;
  secondaryContacts: OwnerPortalSecondaryContact[];
  petAge: OwnerPortalPetAge;
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
  chargesAcknowledged: boolean;
  paymentDueAcknowledged: boolean;
  separateEstimateAcknowledged: boolean;
  signatureData: string;
  typedSignature: string;
  typedSignatureAccepted: boolean;
  declineReason: string;
};

type SignaturePoint = {
  x: number;
  y: number;
};

type MobileSignaturePadProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

type VisitPortalClientProps = {
  token: string;
  initialVisit: OwnerPortalVisit;
};

type RealtimeStatus = "Connecting" | "Live" | "Reconnecting" | "Offline";
type CustomerLanguage = "en" | "es";

const getRealtimeStatus = (status: string): RealtimeStatus => {
  if (status === "SUBSCRIBED") return "Live";
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") return "Reconnecting";
  if (status === "CLOSED") return "Offline";
  return "Connecting";
};

const getCompactVisitStatusLabel = (status: string) => {
  const normalized = status.trim().toLowerCase();

  if (
    normalized === "request submitted" ||
    normalized === "request submitted / waiting for team review" ||
    (normalized.includes("request submitted") && normalized.includes("review"))
  ) {
    return "Request received";
  }

  if (normalized.includes("waiting") && normalized.includes("review")) {
    return "Waiting for review";
  }

  return status;
};

const visitSteps = ["Received", "Triage", "Doctor", "Treatment", "Discharge"];
const defaultPetAvatarSrc = "/pet-placeholder-avatar.svg";

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

const electronicSignatureNotice =
  "I acknowledge that my electronic signature has the same legal effect as a handwritten signature.";
const customerLanguageStorageKey = "mypawlink-customer-language";
const customerLanguageChangedEvent = "mypawlink-language-change";
const visitPortalCopy = {
  en: {
    languageButton: "Español",
    languageAriaLabel: "Switch customer experience to Spanish",
    securePortal: "Secure visit portal",
    hi: "Hi",
    there: "there",
    latestOn: (petName: string) => `Here is the latest on ${petName}.`,
    refresh: "Refresh",
    visitReceived: (petName: string) => `${petName}'s visit request has been received.`,
    noPetPhoto: "No pet photo uploaded",
    synced: "Synced",
    visitOverview: "Visit overview",
    emergencyVisit: "Emergency visit",
    needsReview: (count: number) => `${count} needs review`,
    noActionNeeded: "No action needed",
    started: "Started",
    latest: "Latest",
    waiting: "Waiting",
    forms: "Forms",
    estimates: "Estimates",
    pending: (count: number) => `${count} pending`,
    visitSteps: ["Received", "Triage", "Doctor", "Treatment", "Discharge"],
    quickActions: {
      updates: "Updates",
      actions: "Actions",
      estimates: "Estimates",
      discharge: "Discharge",
    },
    contactsTitle: "Visit Contacts",
    contactsIntro: "People connected to updates for this visit.",
    primaryOwner: "Primary owner",
    owner: "Owner",
    phoneMissing: "Phone not provided",
    emailMissing: "Email not provided",
    fullAccess: "Full access",
    additionalContact: "Additional contact",
    authorizedApprover: "Authorized approver",
    careContact: "Care contact",
    updatesOnly: "Updates only",
    liveTimeline: "Live Timeline",
    updateCount: (count: number) => `${count} updates`,
    emptyTimeline: "Updates will appear here as the clinic sends them.",
    actionsTitle: "Actions",
    actionsIntro: "Forms, estimates, and discharge documents appear here only when your review is needed.",
    clear: "Clear",
    actionNeeded: "Action Needed",
    emergencyCareConsent: "Emergency Care Consent",
    emergencyConsentIntro: "Please review and sign so the veterinary team can begin evaluation and stabilizing care.",
    reviewAndSign: "Review & Sign",
    formFallback: "Form",
    formReviewFallback: "Please review and respond to this form.",
    estimateApprovalNeeded: "Estimate Approval Needed",
    estimateApprovalIntro: "Please review and approve or decline the treatment estimate.",
    reviewEstimate: "Review Estimate",
    dischargeAvailable: "Discharge Instructions Available",
    dischargeReady: "Discharge documents are ready for this visit.",
    viewDischarge: "View Discharge Instructions",
    noActionNow: "No action needed right now.",
    noActionBody: "We will let you know here when something needs your review.",
    completedActions: "Completed Actions",
    backToActions: "Back to Actions",
    pendingStatus: "Pending",
    formBodyFallback: "Please review this form before responding.",
    ownerFullName: "Owner full name",
    relationshipToPet: "Relationship to pet",
    emergencyChecks: [
      "I authorize initial emergency evaluation and stabilizing care for my pet.",
      "I understand that charges may apply for emergency evaluation and stabilizing care.",
      "I understand that payment is due at the time of service.",
      "I understand that additional diagnostics, treatment, hospitalization, procedures, or surgery may require a separate estimate and approval.",
    ],
    signWithFinger: "Sign with your finger",
    clearSignature: "Clear Signature",
    signatureHelp: "Use your finger or stylus to sign inside the box.",
    typedSignature: "Typed signature fallback",
    dateTimeSigned: "Date/time signed",
    submitting: "Submitting...",
    signConsent: "Sign Consent",
    declineReason: "Reason for declining",
    declineWarning: "Declining this consent may delay care. The veterinary team may contact you before care can continue.",
    decline: "Decline",
    careHubTitle: "Care Hub",
    careHubIntro: "Only documents connected to this visit appear here.",
    documentFallback: "Document",
    visitDocumentFallback: "Visit document.",
    noDocuments: "No visit documents are available yet.",
    estimatesTitle: "Treatment Estimates",
    estimatesIntro: "Review estimates and tell the clinic how to proceed.",
    loadingEstimates: "Loading estimates...",
    noEstimates: "No treatment estimates are ready right now.",
    printedName: "Printed name",
    optionalNote: "Optional note or question",
    approve: "Approve",
    requestDiscussion: "Request Discussion",
    ownerResponded: (ownerName: string, status: string) => `${ownerName || "Owner"} responded: ${status}`,
    dischargeTitle: "Discharge Documents",
    dischargeIntro: "Discharge instructions, medication acknowledgments, and follow-up care will appear here when ready.",
    dischargeDocument: "Discharge document",
    noDischargeDocuments: "No discharge documents are ready yet.",
    backToMyPawLink: "Back to MyPawLink",
  },
  es: {
    languageButton: "English",
    languageAriaLabel: "Cambiar la experiencia del cliente a inglés",
    securePortal: "Portal seguro de visita",
    hi: "Hola",
    there: "familia",
    latestOn: (petName: string) => `Aquí está la información más reciente de ${petName}.`,
    refresh: "Actualizar",
    visitReceived: (petName: string) => `La solicitud de visita de ${petName} fue recibida.`,
    noPetPhoto: "No se subió foto de la mascota",
    synced: "Sincronizado",
    visitOverview: "Resumen de la visita",
    emergencyVisit: "Visita de emergencia",
    needsReview: (count: number) => `${count} por revisar`,
    noActionNeeded: "No se necesita acción",
    started: "Inicio",
    latest: "Más reciente",
    waiting: "En espera",
    forms: "Formularios",
    estimates: "Estimados",
    pending: (count: number) => `${count} pendientes`,
    visitSteps: ["Recibido", "Triaje", "Doctor", "Tratamiento", "Alta"],
    quickActions: {
      updates: "Actualizaciones",
      actions: "Acciones",
      estimates: "Estimados",
      discharge: "Alta",
    },
    contactsTitle: "Contactos de la visita",
    contactsIntro: "Personas conectadas a las actualizaciones de esta visita.",
    primaryOwner: "Dueño principal",
    owner: "Dueño",
    phoneMissing: "Teléfono no proporcionado",
    emailMissing: "Correo no proporcionado",
    fullAccess: "Acceso completo",
    additionalContact: "Contacto adicional",
    authorizedApprover: "Autorizado para aprobar",
    careContact: "Contacto de cuidado",
    updatesOnly: "Solo actualizaciones",
    liveTimeline: "Cronología en vivo",
    updateCount: (count: number) => `${count} actualizaciones`,
    emptyTimeline: "Las actualizaciones aparecerán aquí cuando la clínica las envíe.",
    actionsTitle: "Acciones",
    actionsIntro: "Los formularios, estimados y documentos de alta aparecen aquí solo cuando necesitan su revisión.",
    clear: "Sin pendientes",
    actionNeeded: "Acción necesaria",
    emergencyCareConsent: "Consentimiento de atención de emergencia",
    emergencyConsentIntro: "Revise y firme para que el equipo veterinario pueda iniciar la evaluación y el cuidado de estabilización.",
    reviewAndSign: "Revisar y firmar",
    formFallback: "Formulario",
    formReviewFallback: "Revise y responda a este formulario.",
    estimateApprovalNeeded: "Aprobación de estimado necesaria",
    estimateApprovalIntro: "Revise y apruebe o rechace el estimado de tratamiento.",
    reviewEstimate: "Revisar estimado",
    dischargeAvailable: "Instrucciones de alta disponibles",
    dischargeReady: "Los documentos de alta están listos para esta visita.",
    viewDischarge: "Ver instrucciones de alta",
    noActionNow: "No se necesita acción ahora.",
    noActionBody: "Le avisaremos aquí cuando algo necesite su revisión.",
    completedActions: "Acciones completadas",
    backToActions: "Volver a acciones",
    pendingStatus: "Pendiente",
    formBodyFallback: "Revise este formulario antes de responder.",
    ownerFullName: "Nombre completo del dueño",
    relationshipToPet: "Relación con la mascota",
    emergencyChecks: [
      "Autorizo la evaluación de emergencia inicial y el cuidado de estabilización para mi mascota.",
      "Entiendo que pueden aplicarse cargos por la evaluación de emergencia y el cuidado de estabilización.",
      "Entiendo que el pago vence al momento del servicio.",
      "Entiendo que diagnósticos, tratamientos, hospitalización, procedimientos o cirugía adicionales pueden requerir un estimado y aprobación por separado.",
    ],
    signWithFinger: "Firme con su dedo",
    clearSignature: "Borrar firma",
    signatureHelp: "Use su dedo o lápiz táctil para firmar dentro del recuadro.",
    typedSignature: "Firma escrita como respaldo",
    dateTimeSigned: "Fecha/hora de firma",
    submitting: "Enviando...",
    signConsent: "Firmar consentimiento",
    declineReason: "Motivo del rechazo",
    declineWarning: "Rechazar este consentimiento puede retrasar la atención. El equipo veterinario puede contactarle antes de continuar.",
    decline: "Rechazar",
    careHubTitle: "Centro de cuidado",
    careHubIntro: "Solo aparecen aquí los documentos conectados a esta visita.",
    documentFallback: "Documento",
    visitDocumentFallback: "Documento de visita.",
    noDocuments: "Aún no hay documentos de visita disponibles.",
    estimatesTitle: "Estimados de tratamiento",
    estimatesIntro: "Revise los estimados e indique a la clínica cómo proceder.",
    loadingEstimates: "Cargando estimados...",
    noEstimates: "No hay estimados de tratamiento listos ahora.",
    printedName: "Nombre en letra de molde",
    optionalNote: "Nota o pregunta opcional",
    approve: "Aprobar",
    requestDiscussion: "Solicitar conversación",
    ownerResponded: (ownerName: string, status: string) => `${ownerName || "Dueño"} respondió: ${status}`,
    dischargeTitle: "Documentos de alta",
    dischargeIntro: "Las instrucciones de alta, confirmaciones de medicamentos y cuidado de seguimiento aparecerán aquí cuando estén listos.",
    dischargeDocument: "Documento de alta",
    noDischargeDocuments: "Aún no hay documentos de alta listos.",
    backToMyPawLink: "Volver a MyPawLink",
  },
} as const;

const getInitialCustomerLanguage = (): CustomerLanguage => {
  if (typeof window === "undefined") return "en";
  const storedLanguage = window.localStorage.getItem(customerLanguageStorageKey);
  return storedLanguage === "en" || storedLanguage === "es" ? storedLanguage : "en";
};

const emptyClinicFormDraft = (): ClinicFormDraft => ({
  ownerName: "",
  relationship: "",
  authorized: false,
  chargesAcknowledged: false,
  paymentDueAcknowledged: false,
  separateEstimateAcknowledged: false,
  signatureData: "",
  typedSignature: "",
  typedSignatureAccepted: false,
  declineReason: "",
});

function MobileSignaturePad({ value, onChange, disabled = false }: MobileSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<SignaturePoint | null>(null);

  const configureCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.4;
    context.strokeStyle = "#102a3a";

    if (value && value.startsWith("data:image")) {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, rect.width, rect.height);
      };
      image.src = value;
    }
  }, [value]);

  useEffect(() => {
    configureCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => configureCanvas())
        : null;
    resizeObserver?.observe(canvas);
    window.addEventListener("resize", configureCanvas);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", configureCanvas);
    };
  }, [configureCanvas]);

  const getPoint = (clientX: number, clientY: number): SignaturePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const drawTo = (point: SignaturePoint) => {
    const canvas = canvasRef.current;
    const previousPoint = lastPointRef.current;
    if (!canvas || !previousPoint) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
  };

  const beginStroke = (point: SignaturePoint) => {
    if (disabled) return;
    drawingRef.current = true;
    lastPointRef.current = point;
    drawTo({ x: point.x + 0.01, y: point.y + 0.01 });
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    beginStroke(getPoint(event.clientX, event.clientY));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    drawTo(getPoint(event.clientX, event.clientY));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    finishStroke();
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLCanvasElement>) => {
    if ("PointerEvent" in window) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    beginStroke(getPoint(touch.clientX, touch.clientY));
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLCanvasElement>) => {
    if ("PointerEvent" in window || !drawingRef.current) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    drawTo(getPoint(touch.clientX, touch.clientY));
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLCanvasElement>) => {
    if ("PointerEvent" in window) return;
    event.preventDefault();
    finishStroke();
  };

  return (
    <canvas
      ref={canvasRef}
      aria-label="Signature pad"
      style={styles.signatureCanvas}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={finishStroke}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}

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
  const [customerLanguage, setCustomerLanguage] = useState<CustomerLanguage>(getInitialCustomerLanguage);
  const copy = visitPortalCopy[customerLanguage];

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
  const compactStatusLabel = getCompactVisitStatusLabel(visit.status);
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
    : customerLanguage === "es" ? "En progreso" : "In progress";

  const setCustomerLanguagePreference = (language: CustomerLanguage) => {
    setCustomerLanguage(language);
    window.localStorage.setItem(customerLanguageStorageKey, language);
    window.dispatchEvent(
      new CustomEvent(customerLanguageChangedEvent, {
        detail: { language },
      })
    );
  };

  const toggleCustomerLanguage = () => {
    setCustomerLanguagePreference(customerLanguage === "en" ? "es" : "en");
  };

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

  const clearClinicSignature = (formId: string) => {
    updateClinicFormDraft(formId, "signatureData", "");
  };

  const respondToClinicForm = async (
    form: OwnerPortalForm,
    formStatus: "Signed" | "Declined"
  ) => {
    const draft = clinicFormDrafts[form.id] || emptyClinicFormDraft();

    if (formStatus === "Signed") {
      const signatureData = draft.signatureData.trim();
      const typedSignatureData = draft.typedSignature.trim()
        ? "typed-signature:" + draft.typedSignature.trim()
        : "";
      const finalSignatureData = signatureData || (draft.typedSignatureAccepted ? typedSignatureData : "");

      if (!draft.ownerName.trim() || !draft.relationship.trim() || !finalSignatureData) {
        setFormActionMessage("Please complete owner name, relationship, and signature.");
        return;
      }
      if (!signatureData && typedSignatureData && !draft.typedSignatureAccepted) {
        setFormActionMessage("Please confirm that your typed name represents your electronic signature.");
        return;
      }
      if (
        isEmergencyCareConsentForm(form) &&
        (!draft.authorized ||
          !draft.chargesAcknowledged ||
          !draft.paymentDueAcknowledged ||
          !draft.separateEstimateAcknowledged)
      ) {
        setFormActionMessage("Please complete all required Emergency Care Consent acknowledgments.");
        return;
      }

      updateClinicFormDraft(form.id, "signatureData", finalSignatureData);
    }

    if (formStatus === "Declined") {
      if (!draft.ownerName.trim()) {
        setFormActionMessage("Please enter your full name before declining.");
        return;
      }
      if (!draft.declineReason.trim()) {
        setFormActionMessage("Please enter a brief reason before declining.");
        return;
      }
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
            draft.ownerName.trim() +
            (draft.relationship.trim() ? " (" + draft.relationship.trim() + ")" : ""),
          relationshipToPet: draft.relationship.trim(),
          authorizationConfirmed: formStatus === "Signed" ? draft.authorized : false,
          chargesAcknowledged: formStatus === "Signed" ? draft.chargesAcknowledged : false,
          paymentDueAcknowledged: formStatus === "Signed" ? draft.paymentDueAcknowledged : false,
          separateEstimateAcknowledged:
            formStatus === "Signed" ? draft.separateEstimateAcknowledged : false,
          signatureData:
            formStatus === "Signed"
              ? draft.signatureData ||
                (draft.typedSignatureAccepted && draft.typedSignature.trim()
                  ? "typed-signature:" + draft.typedSignature.trim()
                  : "")
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
          : "Declining this consent may delay care. The veterinary team may contact you before care can continue."
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
        <div style={styles.portalUtilityRow}>
          <button
            type="button"
            style={styles.portalLanguageButton}
            onClick={toggleCustomerLanguage}
            aria-label={copy.languageAriaLabel}
          >
            {copy.languageButton}
          </button>
        </div>

        <div style={styles.greeting}>
          <div style={{ minWidth: 0 }}>
            <p style={styles.eyebrow}>{copy.securePortal}</p>
            <h1 style={styles.title}>{copy.hi}, {visit.ownerFirstName || copy.there}.</h1>
            <p style={styles.text}>{copy.latestOn(visit.petName)}</p>
          </div>
          <span style={styles.statusBadge}>{compactStatusLabel}</span>
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
              {copy.refresh}
            </button>
          </div>

          <div style={styles.liveBody}>
            <h2 style={styles.updateTitle}>
              {latestUpdate?.message || copy.visitReceived(visit.petName)}
            </h2>
            <div style={styles.petAvatarWrap}>
              <img
                src={visit.petPhotoUrl || defaultPetAvatarSrc}
                alt={visit.petPhotoUrl ? visit.petName : copy.noPetPhoto}
                style={styles.petAvatar}
              />
              {!visit.petPhotoUrl && <span>{copy.noPetPhoto}</span>}
            </div>
          </div>

          <div style={styles.syncRow}>
            <span>{syncStatus}</span>
            {lastSynced && <span>{copy.synced} {lastSynced}</span>}
          </div>
        </div>

        <section style={styles.ownerOverviewCard}>
          <div style={styles.ownerOverviewHeader}>
            <div>
              <p style={styles.eyebrow}>{copy.visitOverview}</p>
              <h2 style={styles.overviewTitle}>{visit.petName}</h2>
              <p style={styles.text}>
                {[visit.breed || visit.species, visit.petAge?.display, visit.visitType || copy.emergencyVisit]
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
              {needsAttentionCount > 0 ? copy.needsReview(needsAttentionCount) : copy.noActionNeeded}
            </span>
          </div>

          <div style={styles.ownerMetricGrid}>
            <div style={styles.ownerMetric}>
              <span>{copy.started}</span>
              <strong>{visitStartedLabel}</strong>
            </div>
            <div style={styles.ownerMetric}>
              <span>{copy.latest}</span>
              <strong>{latestUpdate?.time || copy.waiting}</strong>
            </div>
            <div style={styles.ownerMetric}>
              <span>{copy.forms}</span>
              <strong>{copy.pending(pendingClinicForms.length)}</strong>
            </div>
            <div style={styles.ownerMetric}>
              <span>{copy.estimates}</span>
              <strong>{copy.pending(pendingEstimateCount)}</strong>
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
                <small>{copy.visitSteps[index]}</small>
              </div>
            ))}
          </div>

          <div style={styles.quickActionGrid}>
            <button type="button" style={styles.quickActionButton} onClick={() => jumpToSection("timeline")}>
              {copy.quickActions.updates}
            </button>
            <button type="button" style={styles.quickActionButton} onClick={() => jumpToSection("actions")}>
              {copy.quickActions.actions}
            </button>
            <button type="button" style={styles.quickActionButton} onClick={() => jumpToSection("estimates")}>
              {copy.quickActions.estimates}
            </button>
            <button type="button" style={styles.quickActionButton} onClick={() => jumpToSection("discharge")}>
              {copy.quickActions.discharge}
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>{copy.contactsTitle}</h2>
              <p style={styles.text}>{copy.contactsIntro}</p>
            </div>
          </div>
          <div style={styles.contactStack}>
            <div style={styles.contactCard}>
              <span style={styles.actionEyebrow}>{copy.primaryOwner}</span>
              <strong>{[visit.ownerFirstName, visit.ownerLastName].filter(Boolean).join(" ") || copy.owner}</strong>
              <span>{visit.phone || copy.phoneMissing}</span>
              <span>{visit.ownerEmail || copy.emailMissing}</span>
              <span style={styles.permissionBadge}>{copy.fullAccess}</span>
            </div>
            {(visit.secondaryContacts || []).map((contact) => (
              <div key={`${contact.name}-${contact.phone}-${contact.email}`} style={styles.contactCard}>
                <span style={styles.actionEyebrow}>{copy.additionalContact}</span>
                <strong>{contact.name}</strong>
                <span>{contact.relationship}</span>
                <span>{contact.phone || copy.phoneMissing}</span>
                <span>{contact.email || copy.emailMissing}</span>
                <span style={styles.permissionBadge}>
                  {contact.permissionLevel === "Can approve estimates/forms"
                    ? copy.authorizedApprover
                    : contact.permissionLevel === "Can discuss care"
                      ? copy.careContact
                      : copy.updatesOnly}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div style={styles.grid}>
          <section id="timeline" style={styles.card}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>{copy.liveTimeline}</h2>
              <span style={styles.timelineCount}>{copy.updateCount(visit.updates.length)}</span>
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
              <p style={styles.text}>{copy.emptyTimeline}</p>
            )}
          </section>

          <section id="actions" style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>{copy.actionsTitle}</h2>
                <p style={styles.text}>{copy.actionsIntro}</p>
              </div>
              <span style={styles.timelineCount}>
                {needsAttentionCount > 0 ? copy.pending(needsAttentionCount) : copy.clear}
              </span>
            </div>

            {formActionMessage && <div style={styles.careHubNotice}>{formActionMessage}</div>}

            {!selectedClinicForm && (
              <div style={styles.actionStack}>
                {pendingEmergencyConsent && (
                  <div style={styles.actionNeededCard}>
                    <span style={styles.actionEyebrow}>{copy.actionNeeded}</span>
                    <strong>{copy.emergencyCareConsent}</strong>
                    <p>{copy.emergencyConsentIntro}</p>
                    <button
                      type="button"
                      style={styles.signButton}
                      onClick={() => openClinicForm(pendingEmergencyConsent.id)}
                    >
                      {copy.reviewAndSign}
                    </button>
                  </div>
                )}

                {pendingOtherClinicForms.map((form) => (
                  <div key={form.id} style={styles.actionNeededCard}>
                    <span style={styles.actionEyebrow}>{copy.actionNeeded}</span>
                    <strong>{form.form_type || copy.formFallback}</strong>
                    <p>{form.form_body || copy.formReviewFallback}</p>
                    <button type="button" style={styles.signButton} onClick={() => openClinicForm(form.id)}>
                      {copy.reviewAndSign}
                    </button>
                  </div>
                ))}

                {pendingEstimateCount > 0 && (
                  <div style={styles.actionInfoCard}>
                    <span style={styles.actionEyebrow}>{copy.estimateApprovalNeeded}</span>
                    <strong>{copy.estimateApprovalIntro}</strong>
                    <button type="button" style={styles.secondaryActionButton} onClick={() => jumpToSection("estimates")}>
                      {copy.reviewEstimate}
                    </button>
                  </div>
                )}

                {hasDischargeDocuments && (
                  <div style={styles.actionInfoCard}>
                    <span style={styles.actionEyebrow}>{copy.dischargeAvailable}</span>
                    <strong>{copy.dischargeReady}</strong>
                    <button type="button" style={styles.secondaryActionButton} onClick={() => jumpToSection("discharge")}>
                      {copy.viewDischarge}
                    </button>
                  </div>
                )}

                {pendingClinicForms.length === 0 && pendingEstimateCount === 0 && !hasDischargeDocuments && (
                  <div style={styles.emptyBox}>
                    <strong>{copy.noActionNow}</strong>
                    <span>{copy.noActionBody}</span>
                  </div>
                )}

                {completedClinicForms.length > 0 && (
                  <div style={styles.completedActionBox}>
                    <span style={styles.actionEyebrow}>{copy.completedActions}</span>
                    {completedClinicForms.map((form) => (
                      <div key={form.id} style={styles.completedActionItem}>
                        <strong>{form.form_type || copy.formFallback}</strong>
                        <span>
                          {form.form_status}
                          {form.signed_at
                            ? " at " + new Date(form.signed_at).toLocaleString()
                            : form.declined_at
                              ? " at " + new Date(form.declined_at).toLocaleString()
                              : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedClinicForm && (
              <div style={styles.consentShell}>
                <button type="button" style={styles.backButton} onClick={() => setSelectedClinicFormId(null)}>
                  {copy.backToActions}
                </button>
                <span style={styles.formStatus}>{selectedClinicForm.form_status || copy.pendingStatus}</span>
                <h3 style={styles.careHubTitle}>{selectedClinicForm.form_type || copy.formFallback}</h3>
                <div style={styles.legalBox}>
                  {(selectedClinicForm.form_body || copy.formBodyFallback)
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
                    placeholder={copy.ownerFullName}
                    autoComplete="name"
                  />
                  <input
                    style={styles.input}
                    value={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).relationship}
                    onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "relationship", event.target.value)}
                    placeholder={copy.relationshipToPet}
                  />
                  {isEmergencyCareConsentForm(selectedClinicForm) && (
                    <div style={styles.checkboxStack}>
                      <label style={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).authorized}
                          onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "authorized", event.target.checked)}
                        />
                        {copy.emergencyChecks[0]}
                      </label>
                      <label style={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).chargesAcknowledged}
                          onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "chargesAcknowledged", event.target.checked)}
                        />
                        {copy.emergencyChecks[1]}
                      </label>
                      <label style={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).paymentDueAcknowledged}
                          onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "paymentDueAcknowledged", event.target.checked)}
                        />
                        {copy.emergencyChecks[2]}
                      </label>
                      <label style={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).separateEstimateAcknowledged}
                          onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "separateEstimateAcknowledged", event.target.checked)}
                        />
                        {copy.emergencyChecks[3]}
                      </label>
                    </div>
                  )}
                  <div style={styles.signaturePadShell}>
                    <div style={styles.signatureHintRow}>
                      <span>{copy.signWithFinger}</span>
                      <button
                        type="button"
                        style={styles.clearSignatureButton}
                        onClick={() => clearClinicSignature(selectedClinicForm.id)}
                      >
                        {copy.clearSignature}
                      </button>
                    </div>
                    <MobileSignaturePad
                      value={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).signatureData}
                      onChange={(value) => updateClinicFormDraft(selectedClinicForm.id, "signatureData", value)}
                    />
                    <span style={styles.signatureHelper}>
                      {copy.signatureHelp}
                    </span>
                  </div>
                  <div style={styles.typedSignatureBox}>
                    <input
                      style={styles.input}
                      value={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).typedSignature}
                      onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "typedSignature", event.target.value)}
                      placeholder={copy.typedSignature}
                      autoComplete="name"
                    />
                    <label style={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).typedSignatureAccepted}
                        onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "typedSignatureAccepted", event.target.checked)}
                      />
                      {electronicSignatureNotice}
                    </label>
                  </div>
                  <div style={styles.legalNotice}>{electronicSignatureNotice}</div>
                  <div style={styles.timestampBox}>{copy.dateTimeSigned}: {new Date().toLocaleString()}</div>
                  <button
                    type="button"
                    style={{ ...styles.signButton, ...(respondingFormId ? styles.disabledButton : {}) }}
                    disabled={Boolean(respondingFormId)}
                    onClick={() => void respondToClinicForm(selectedClinicForm, "Signed")}
                  >
                    {respondingFormId === selectedClinicForm.id ? copy.submitting : copy.signConsent}
                  </button>
                  <textarea
                    style={styles.estimateNotes}
                    value={(clinicFormDrafts[selectedClinicForm.id] || emptyClinicFormDraft()).declineReason}
                    onChange={(event) => updateClinicFormDraft(selectedClinicForm.id, "declineReason", event.target.value)}
                    placeholder={copy.declineReason}
                  />
                  <div style={styles.warningBox}>{copy.declineWarning}</div>
                  <button
                    type="button"
                    style={styles.declineButton}
                    disabled={Boolean(respondingFormId)}
                    onClick={() => void respondToClinicForm(selectedClinicForm, "Declined")}
                  >
                    {copy.decline}
                  </button>
                </form>
              </div>
            )}
          </section>

          <section id="care-hub" style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>{copy.careHubTitle}</h2>
                <p style={styles.text}>{copy.careHubIntro}</p>
              </div>
            </div>
            <div style={styles.formList}>
              {completedClinicForms.length > 0 ? (
                completedClinicForms.map((form) => (
                  <div key={form.id} style={styles.formCard}>
                    <div>
                      <strong>{form.form_type || copy.documentFallback}</strong>
                      <p style={styles.formText}>{form.form_body || copy.visitDocumentFallback}</p>
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
                <div style={styles.emptyBox}>{copy.noDocuments}</div>
              )}
            </div>
          </section>

          <section id="estimates" style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>{copy.estimatesTitle}</h2>
                <p style={styles.text}>{copy.estimatesIntro}</p>
              </div>
              <span style={styles.timelineCount}>
                {copy.pending(pendingEstimateCount)}
              </span>
            </div>

            {estimateMessage && <div style={styles.careHubNotice}>{estimateMessage}</div>}
            {estimateLoading && <div style={styles.emptyBox}>{copy.loadingEstimates}</div>}

            {!estimateLoading && estimates.length === 0 && (
              <div style={styles.emptyBox}>{copy.noEstimates}</div>
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
                          placeholder={copy.printedName}
                        />
                        <textarea
                          style={styles.estimateNotes}
                          value={draft.notes}
                          onChange={(event) =>
                            updateEstimateDraft(estimate.id, "notes", event.target.value)
                          }
                          placeholder={copy.optionalNote}
                        />
                        <div style={styles.legalNotice}>{electronicSignatureNotice}</div>
                        <div style={styles.estimateButtonGrid}>
                          <button
                            type="button"
                            style={styles.approveButton}
                            disabled={isResponding}
                            onClick={() => void respondToEstimate(estimate, "approved")}
                          >
                            {copy.approve}
                          </button>
                          <button
                            type="button"
                            style={styles.discussButton}
                            disabled={isResponding}
                            onClick={() => void respondToEstimate(estimate, "discussion")}
                          >
                            {copy.requestDiscussion}
                          </button>
                          <button
                            type="button"
                            style={styles.declineButton}
                            disabled={isResponding}
                            onClick={() => void respondToEstimate(estimate, "declined")}
                          >
                            {copy.decline}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.estimateResponseSummary}>
                        <strong>
                          {copy.ownerResponded(estimate.ownerName, estimate.status)}
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
            <h2 style={styles.sectionTitle}>{copy.dischargeTitle}</h2>
            <p style={styles.text}>{copy.dischargeIntro}</p>
            <div style={styles.dischargeList}>
              {dischargeClinicForms.map((form) => (
                <div key={form.id} style={styles.dischargeItem}>
                  <strong>{form.form_type || copy.dischargeDocument}</strong>
                  <span>{form.form_status || copy.pendingStatus}</span>
                </div>
              ))}
              {dischargeClinicForms.length === 0 && (
                <div style={styles.emptyBox}>{copy.noDischargeDocuments}</div>
              )}
            </div>
          </section>

          <Link href="/" style={styles.homeLink}>
            {copy.backToMyPawLink}
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
  portalUtilityRow: {
    alignItems: "center",
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  portalLanguageButton: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 36,
    padding: "7px 10px",
  },
  greeting: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 14,
    minWidth: 0,
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
    lineHeight: 1.2,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    textAlign: "right",
    whiteSpace: "normal",
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
  petAvatarWrap: {
    alignItems: "center",
    color: "#087f78",
    display: "grid",
    fontSize: 10,
    fontWeight: 900,
    gap: 5,
    justifyItems: "center",
    textAlign: "center",
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
  contactStack: {
    display: "grid",
    gap: 10,
  },
  contactCard: {
    background: "#fbffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#52606d",
    display: "grid",
    fontSize: 13,
    gap: 4,
    padding: 12,
  },
  permissionBadge: {
    background: "#e6f7f5",
    border: "1px solid #bfe9e0",
    borderRadius: 999,
    color: "#087f78",
    fontSize: 11,
    fontWeight: 900,
    justifySelf: "start",
    padding: "5px 8px",
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
  completedActionBox: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    display: "grid",
    gap: 8,
    padding: 12,
  },
  completedActionItem: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#52606d",
    display: "grid",
    fontSize: 13,
    gap: 3,
    padding: 10,
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
  checkboxStack: {
    display: "grid",
    gap: 8,
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
    height: 190,
    touchAction: "none",
    width: "100%",
  },
  signatureHelper: {
    color: "#64717d",
    fontSize: 12,
    fontWeight: 800,
  },
  typedSignatureBox: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    display: "grid",
    gap: 8,
    padding: 10,
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
  legalNotice: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#52606d",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.45,
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
