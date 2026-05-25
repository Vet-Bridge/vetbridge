export type ExternalSystem =
  | "MyPawLink"
  | "ezyVet"
  | "SmartFlow"
  | "Cornerstone"
  | "other_future_pms";

export type IntegrationDirection = "inbound" | "outbound";

export type IntegrationEventStatus =
  | "received"
  | "pending_review"
  | "processed"
  | "failed"
  | "ignored";

export type IntegrationConnectionConfig = {
  clinicId: string;
  externalSystem: ExternalSystem;
  connectionName: string;
  credentialsReference?: string;
  baseUrl?: string;
};

export type NormalizedClient = {
  id?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  preferredContactMethod?: string;
};

export type NormalizedPet = {
  id?: string;
  name: string;
  species?: string;
  breed?: string;
  sex?: string;
  dateOfBirth?: string;
  ageYears?: number;
  ageMonths?: number;
  ageUnknown?: boolean;
};

export type NormalizedSecondaryContact = {
  firstName: string;
  lastName: string;
  relationship?: string;
  phone?: string;
  email?: string;
  canReceiveUpdates: boolean;
  canAuthorizeCare: boolean;
};

export type NormalizedVisit = {
  id: string;
  clinicId: string;
  client: NormalizedClient;
  pet: NormalizedPet;
  secondaryContacts: NormalizedSecondaryContact[];
  visitType?: string;
  reasonForVisit?: string;
  referralSource?: string;
  referralClinicName?: string;
  status?: string;
  clientVisibleStatus?: string;
  checkInCompletedAt?: string;
  externalClientId?: string;
  externalPatientId?: string;
  externalVisitId?: string;
  externalAppointmentId?: string;
};

export type RawIntegrationEvent = {
  clinicId: string;
  visitId?: string;
  externalSystem: ExternalSystem;
  direction: IntegrationDirection;
  eventType: string;
  externalRecordId?: string;
  payload: Record<string, unknown>;
};

export type NormalizedInboundEvent = {
  clinicId: string;
  visitId?: string;
  externalSystem: ExternalSystem;
  eventType: string;
  internalStatus?: string;
  clientVisibleMessage?: string;
  sourceRecordId?: string;
  requiresReview: boolean;
  approvedForClient: boolean;
  normalizedPayload: Record<string, unknown>;
};

export type OutboundSyncRequest = {
  clinicId: string;
  visit: NormalizedVisit;
  documents?: Array<{
    id: string;
    documentType: string;
    fileName: string;
    privateFilePath: string;
  }>;
  forms?: Array<{
    id: string;
    title: string;
    status: string;
    signedAt?: string;
  }>;
};

export type DocumentSyncRequest = {
  clinicId: string;
  visitId: string;
  documentId: string;
  documentType: string;
  privateFilePath: string;
};

export type IntegrationResult<T = Record<string, unknown>> = {
  ok: boolean;
  status: IntegrationEventStatus | "mock_ready";
  data?: T;
  error?: string;
};

export type IntegrationConnector = {
  externalSystem: ExternalSystem;
  validateConnection(config?: IntegrationConnectionConfig): Promise<IntegrationResult>;
  normalizeInboundEvent(event: RawIntegrationEvent): Promise<IntegrationResult<NormalizedInboundEvent>>;
  createOutboundPayload(request: OutboundSyncRequest): Promise<IntegrationResult>;
  processInboundEvent(event: RawIntegrationEvent): Promise<IntegrationResult<NormalizedInboundEvent>>;
  syncVisit(request: OutboundSyncRequest): Promise<IntegrationResult>;
  syncDocument(request: DocumentSyncRequest): Promise<IntegrationResult>;
  handleError(error: unknown, context?: Record<string, unknown>): IntegrationResult;
};
