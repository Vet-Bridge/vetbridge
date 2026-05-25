import type {
  DocumentSyncRequest,
  IntegrationConnector,
  IntegrationResult,
  NormalizedInboundEvent,
  OutboundSyncRequest,
  RawIntegrationEvent,
} from "../shared/types";

const notConnectedMessage =
  "SmartFlow connector is structure-only. No live SmartFlow API calls are made yet.";

const buildClientSafeMessage = (eventType: string) => {
  if (eventType.includes("vital")) return "The care team recorded a monitoring update.";
  if (eventType.includes("medication")) return "The care team recorded a treatment update.";
  if (eventType.includes("plan")) return "The care team updated the care plan.";
  if (eventType.includes("status")) return "The care team posted a workflow update.";
  return "A clinical workflow update is ready for staff review.";
};

export const smartflowConnector: IntegrationConnector = {
  externalSystem: "SmartFlow",

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
        externalSystem: "SmartFlow",
        eventType: event.eventType,
        internalStatus: String(event.payload.status || event.eventType),
        clientVisibleMessage: buildClientSafeMessage(event.eventType.toLowerCase()),
        sourceRecordId: event.externalRecordId,
        requiresReview: true,
        approvedForClient: false,
        normalizedPayload: {
          source: "SmartFlow",
          clientSafeDraft: buildClientSafeMessage(event.eventType.toLowerCase()),
          reviewReason: "Clinical workflow data must be reviewed before client communication.",
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
        externalSystem: "SmartFlow",
        syncScope: "workflow-context-only",
        visitId: request.visit.id,
        patient: request.visit.pet,
        clientVisibleStatus: request.visit.clientVisibleStatus,
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
      error: error instanceof Error ? error.message : "Unknown SmartFlow connector error.",
      data: context,
    };
  },
};
