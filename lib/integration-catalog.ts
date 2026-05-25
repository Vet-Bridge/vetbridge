export type IntegrationQueueSummary = {
  queued: number;
  processed: number;
  failed: number;
  lastEventAt: string;
};

export type IntegrationProviderReadiness = {
  key: string;
  name: string;
  category: string;
  direction: string;
  description: string;
  capabilities: string[];
  enabled: boolean;
  status: string;
  syncMode: string;
  externalClinicId: string;
  lastSyncAt: string;
};

export type IntegrationReadiness = {
  setupRequired: boolean;
  providers: IntegrationProviderReadiness[];
  queueSummary: IntegrationQueueSummary;
  supportedEvents: string[];
};

export const integrationSupportedEvents = [
  "visit.created",
  "visit.status_changed",
  "visit.doctor_assigned",
  "visit.form_sent",
  "visit.ready_for_pickup",
  "visit.discharged",
  "referral.created",
  "referral.converted_to_visit",
  "owner.form_signed",
  "owner.document_uploaded",
  "notification.sms_sent",
  "integration.event_received",
  "integration.update_pending_review",
  "integration.sync_attempted",
  "integration.sync_failed",
];

export const integrationProviderCatalog: IntegrationProviderReadiness[] = [
  {
    key: "mypawlink-api",
    name: "MyPawLink Integration API",
    category: "Internal API",
    direction: "Two-way",
    description: "Internal event gateway for visit, document, form, owner communication, and review workflows.",
    capabilities: ["Visit events", "Owner links", "Forms", "Documents", "Notifications"],
    enabled: true,
    status: "Sandbox ready",
    syncMode: "event queue",
    externalClinicId: "",
    lastSyncAt: "",
  },
  {
    key: "ezyvet",
    name: "ezyVet",
    category: "PMS",
    direction: "Outbound",
    description: "Future non-billing sync for completed check-ins, client/patient details, referrals, signed forms, and documents.",
    capabilities: ["Client records", "Patients", "Appointments", "Signed forms", "Documents", "Referral details"],
    enabled: false,
    status: "Not connected",
    syncMode: "planned API",
    externalClinicId: "",
    lastSyncAt: "",
  },
  {
    key: "smartflow",
    name: "SmartFlow",
    category: "Clinical workflow",
    direction: "Inbound",
    description: "Future inbound workflow feed for reviewed client-facing status updates derived from clinical workflow data.",
    capabilities: ["Treatment milestones", "Vitals review queue", "Medication review queue", "Care plan review queue"],
    enabled: false,
    status: "Not connected",
    syncMode: "planned connector",
    externalClinicId: "",
    lastSyncAt: "",
  },
  {
    key: "cornerstone",
    name: "IDEXX Cornerstone",
    category: "PMS",
    direction: "Outbound",
    description: "Future non-billing sync for check-in summaries, client/patient details, signed forms, and documents.",
    capabilities: ["Client records", "Patients", "Appointments", "Signed forms", "Documents"],
    enabled: false,
    status: "Not connected",
    syncMode: "planned connector",
    externalClinicId: "",
    lastSyncAt: "",
  },
  {
    key: "other_future_pms",
    name: "Other PMS",
    category: "PMS",
    direction: "Outbound",
    description: "Future connector slot for additional non-billing PMS record sync.",
    capabilities: ["Client records", "Patients", "Visit summaries", "Signed forms", "Documents"],
    enabled: false,
    status: "Not connected",
    syncMode: "planned connector",
    externalClinicId: "",
    lastSyncAt: "",
  },
];

export const integrationProviderKeys = integrationProviderCatalog.map((provider) => provider.key);

export const defaultIntegrationQueueSummary: IntegrationQueueSummary = {
  queued: 0,
  processed: 0,
  failed: 0,
  lastEventAt: "",
};

export const buildFallbackIntegrationReadiness = (
  setupRequired = true
): IntegrationReadiness => ({
  setupRequired,
  providers: integrationProviderCatalog,
  queueSummary: defaultIntegrationQueueSummary,
  supportedEvents: integrationSupportedEvents,
});
