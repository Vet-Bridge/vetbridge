import type {
  DocumentSyncRequest,
  IntegrationConnector,
  IntegrationResult,
  NormalizedInboundEvent,
  OutboundSyncRequest,
  RawIntegrationEvent,
} from "../shared/types";

const notConnectedMessage =
  "ezyVet connector is structure-only. No live ezyVet API calls are made yet.";

export const ezyvetConnector: IntegrationConnector = {
  externalSystem: "ezyVet",

  async validateConnection(): Promise<IntegrationResult> {
    return {
      ok: true,
      status: "mock_ready",
      data: {
        connected: false,
        message: notConnectedMessage,
      },
    };
  },

  async normalizeInboundEvent(event: RawIntegrationEvent): Promise<IntegrationResult<NormalizedInboundEvent>> {
    return {
      ok: true,
      status: "pending_review",
      data: {
        clinicId: event.clinicId,
        visitId: event.visitId,
        externalSystem: "ezyVet",
        eventType: event.eventType,
        sourceRecordId: event.externalRecordId,
        requiresReview: true,
        approvedForClient: false,
        normalizedPayload: {
          source: "ezyVet",
          note: "Future inbound ezyVet event normalized for staff review.",
          rawPayload: event.payload,
        },
      },
    };
  },

  async createOutboundPayload(request: OutboundSyncRequest): Promise<IntegrationResult> {
    return {
      ok: true,
      status: "mock_ready",
      data: {
        externalSystem: "ezyVet",
        syncScope: "non-billing",
        client: request.visit.client,
        patient: request.visit.pet,
        visit: {
          id: request.visit.id,
          visitType: request.visit.visitType,
          reasonForVisit: request.visit.reasonForVisit,
          referralSource: request.visit.referralSource,
          referralClinicName: request.visit.referralClinicName,
          status: request.visit.status,
          checkInCompletedAt: request.visit.checkInCompletedAt,
        },
        secondaryContacts: request.visit.secondaryContacts,
        forms: request.forms || [],
        documents: request.documents || [],
        excludedByDesign: ["invoices", "payments", "billing", "payment processing"],
      },
    };
  },

  async processInboundEvent(event: RawIntegrationEvent): Promise<IntegrationResult<NormalizedInboundEvent>> {
    return this.normalizeInboundEvent(event);
  },

  async syncVisit(request: OutboundSyncRequest): Promise<IntegrationResult> {
    const payload = await this.createOutboundPayload(request);
    return {
      ok: true,
      status: "mock_ready",
      data: {
        message: notConnectedMessage,
        payload: payload.data || {},
      },
    };
  },

  async syncDocument(request: DocumentSyncRequest): Promise<IntegrationResult> {
    return {
      ok: true,
      status: "mock_ready",
      data: {
        message: notConnectedMessage,
        document: request,
      },
    };
  },

  handleError(error: unknown, context = {}): IntegrationResult {
    return {
      ok: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown ezyVet connector error.",
      data: context,
    };
  },
};
