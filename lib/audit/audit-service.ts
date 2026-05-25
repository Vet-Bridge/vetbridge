import { getSupabaseAdmin } from "../supabase-admin";

type AuditMetadata = Record<string, unknown>;

export type AuditActionInput = {
  clinicId?: string;
  userId?: string;
  visitId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
};

const isMissingAuditTableError = (error: unknown) => {
  const dbError = error as { code?: string; message?: string } | null;
  const message = dbError?.message?.toLowerCase() || "";
  return dbError?.code === "42P01" || dbError?.code === "42703" || message.includes("audit_logs");
};

export const recordAuditLog = async ({
  clinicId = "",
  userId = "",
  visitId = "",
  action,
  entityType,
  entityId = "",
  metadata = {},
  ipAddress = "",
  userAgent = "",
}: AuditActionInput) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("audit_logs").insert([
      {
        clinic_id: clinicId || null,
        user_id: userId || null,
        visit_id: visitId || null,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        metadata_json: metadata,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      },
    ]);

    if (error) throw error;
    return { recorded: true };
  } catch (error) {
    if (isMissingAuditTableError(error)) {
      console.info("Audit log skipped. Run the Phase 15 SQL to enable audit logging.");
      return { recorded: false, reason: "not-configured" };
    }

    console.error("Unable to record audit log:", error);
    return {
      recorded: false,
      reason: error instanceof Error ? error.message : "audit-log-error",
    };
  }
};
