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
  "visit.estimate_sent",
  "visit.ready_for_pickup",
  "visit.discharged",
  "referral.created",
  "referral.converted_to_visit",
  "owner.form_signed",
  "owner.estimate_response",
];

export const integrationProviderCatalog: IntegrationProviderReadiness[] = [
  {
    key: "mypawlink-api",
    name: "MyPawLink Integration API",
    category: "Internal API",
    direction: "Two-way",
    description: "Internal event gateway that queues updates for future partner systems.",
    capabilities: ["Visit events", "Owner links", "Forms", "Estimates"],
    enabled: true,
    status: "Sandbox ready",
    syncMode: "event queue",
    externalClinicId: "",
    lastSyncAt: "",
  },
  {
    key: "ezyvet",
    name: "ezyVet",
    category: "PIMS",
    direction: "Two-way",
    description: "Future connection for patient, client, visit, invoice, and treatment data.",
    capabilities: ["Client records", "Patients", "Appointments", "Invoices"],
    enabled: false,
    status: "Not connected",
    syncMode: "planned API",
    externalClinicId: "",
    lastSyncAt: "",
  },
  {
    key: "cornerstone",
    name: "IDEXX Cornerstone",
    category: "PIMS",
    direction: "Two-way",
    description: "Future connection for established hospital client and patient records.",
    capabilities: ["Clients", "Patients", "Medical notes", "Invoices"],
    enabled: false,
    status: "Not connected",
    syncMode: "planned connector",
    externalClinicId: "",
    lastSyncAt: "",
  },
  {
    key: "instinct",
    name: "Instinct",
    category: "Patient care workflow",
    direction: "Inbound",
    description: "Future treatment-board connection for milestones, orders, and ICU updates.",
    capabilities: ["Treatment events", "Vitals", "Orders", "Hospitalization updates"],
    enabled: false,
    status: "Not connected",
    syncMode: "planned API",
    externalClinicId: "",
    lastSyncAt: "",
  },
  {
    key: "avimark",
    name: "AVImark",
    category: "PIMS",
    direction: "Two-way",
    description: "Future connection for clinics using AVImark patient and client records.",
    capabilities: ["Client records", "Patients", "Charges", "Medical notes"],
    enabled: false,
    status: "Not connected",
    syncMode: "planned connector",
    externalClinicId: "",
    lastSyncAt: "",
  },
];

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
